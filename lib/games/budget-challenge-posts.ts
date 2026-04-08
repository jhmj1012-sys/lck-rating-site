import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { budgetChallengeConfig, budgetChallengePlayers } from "@/lib/games/budget-challenge-data";
import type {
  BudgetChallengeComment,
  BudgetChallengePost,
  BudgetChallengePostRecord,
  BudgetChallengePostSlot,
  ChallengeSelection,
} from "@/lib/games/budget-challenge-types";
import { createChallengeSummary, decodeSelection, encodeSelection } from "@/lib/games/budget-challenge-utils";

const postsDirectory = path.join(process.cwd(), "data");
const postsPath = path.join(postsDirectory, "budget-challenge-posts.json");

type BudgetChallengePostStore = {
  posts: BudgetChallengePostRecord[];
  nextIds: Record<string, number>;
};

let mutationQueue = Promise.resolve();

function createPostId(store: BudgetChallengePostStore) {
  const nextValue = store.nextIds.posts ?? 1;
  store.nextIds.posts = nextValue + 1;
  return `budget_post_${nextValue}`;
}

function createCommentId(store: BudgetChallengePostStore) {
  const nextValue = store.nextIds.comments ?? 1;
  store.nextIds.comments = nextValue + 1;
  return `budget_comment_${nextValue}`;
}

function getPlayersById() {
  return new Map(budgetChallengePlayers.map((player) => [player.id, player]));
}

function sanitizeSelection(selection: ChallengeSelection) {
  const playersById = getPlayersById();

  return Object.entries(selection).reduce<ChallengeSelection>((acc, [position, playerId]) => {
    if (!playerId || !playersById.has(playerId)) {
      return acc;
    }

    acc[position as keyof ChallengeSelection] = playerId;
    return acc;
  }, {});
}

function buildSlots(selection: ChallengeSelection): BudgetChallengePostSlot[] {
  const playersById = getPlayersById();

  return budgetChallengeConfig.slots
    .map((slot) => {
      const playerId = selection[slot.position];
      const player = playerId ? playersById.get(playerId) : undefined;
      if (!playerId || !player) {
        return null;
      }

      return {
        position: slot.position,
        playerId,
        playerName: player.name,
        team: player.team,
        price: player.price,
      } satisfies BudgetChallengePostSlot;
    })
    .filter((slot): slot is BudgetChallengePostSlot => slot !== null);
}

function validateSelection(encodedSelection: string) {
  const selection = sanitizeSelection(decodeSelection(encodedSelection));
  const playersById = getPlayersById();
  const summary = createChallengeSummary(budgetChallengeConfig, selection, playersById);

  if (!summary.isComplete) {
    throw new Error("5개 포지션을 모두 채운 완성 조합만 저장할 수 있습니다.");
  }

  return {
    encodedSelection: encodeSelection(selection),
    summary,
    slots: buildSlots(selection),
  };
}

function normalizeComment(raw: unknown): BudgetChallengeComment | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<BudgetChallengeComment>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.authorId !== "string" ||
    typeof candidate.authorNickname !== "string" ||
    typeof candidate.body !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    authorId: candidate.authorId,
    authorNickname: candidate.authorNickname,
    body: candidate.body,
    createdAt: candidate.createdAt,
  };
}

function normalizePost(raw: BudgetChallengePostRecord): BudgetChallengePostRecord {
  return {
    ...raw,
    likeUserIds: Array.isArray(raw.likeUserIds) ? raw.likeUserIds.filter((value): value is string => typeof value === "string") : [],
    comments: Array.isArray(raw.comments) ? raw.comments.map(normalizeComment).filter((value): value is BudgetChallengeComment => value !== null) : [],
  };
}

function toPostView(post: BudgetChallengePostRecord, viewerId?: string | null): BudgetChallengePost {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    authorId: post.authorId,
    authorNickname: post.authorNickname,
    createdAt: post.createdAt,
    encodedSelection: post.encodedSelection,
    usedBudget: post.usedBudget,
    slots: post.slots,
    comments: post.comments.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    commentCount: post.comments.length,
    likeCount: post.likeUserIds.length,
    likedByMe: viewerId ? post.likeUserIds.includes(viewerId) : false,
  };
}

async function ensurePostStore(): Promise<BudgetChallengePostStore> {
  try {
    const content = await readFile(postsPath, "utf8");
    const parsed = JSON.parse(content) as Partial<BudgetChallengePostStore>;

    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts.map((post) => normalizePost(post as BudgetChallengePostRecord)) : [],
      nextIds: {
        posts: parsed.nextIds?.posts ?? 1,
        comments: parsed.nextIds?.comments ?? 1,
      },
    };
  } catch {
    const initialStore = { posts: [], nextIds: { posts: 1, comments: 1 } };
    await mkdir(postsDirectory, { recursive: true });
    await writeFile(postsPath, JSON.stringify(initialStore, null, 2), "utf8");
    return initialStore;
  }
}

async function savePostStore(store: BudgetChallengePostStore) {
  await mkdir(postsDirectory, { recursive: true });
  await writeFile(postsPath, JSON.stringify(store, null, 2), "utf8");
}

async function mutatePostStore<T>(callback: (store: BudgetChallengePostStore) => Promise<T> | T): Promise<T> {
  const runMutation = async () => {
    const store = await ensurePostStore();
    const result = await callback(store);
    await savePostStore(store);
    return result;
  };

  const resultPromise = mutationQueue.then(runMutation, runMutation);
  mutationQueue = resultPromise.then(
    () => undefined,
    () => undefined,
  );

  return resultPromise;
}

function getPostOrThrow(store: BudgetChallengePostStore, postId: string) {
  const post = store.posts.find((item) => item.id === postId);
  if (!post) {
    throw new Error("게시글을 찾을 수 없습니다.");
  }

  return post;
}

export async function listBudgetChallengePosts(viewerId?: string | null) {
  const store = await ensurePostStore();

  return store.posts
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((post) => toPostView(post, viewerId));
}

export async function createBudgetChallengePost(input: {
  authorId: string;
  authorNickname: string;
  title: string;
  body: string;
  encodedSelection: string;
}) {
  const title = input.title.trim();
  const body = input.body.trim();

  if (title.length < 2) {
    throw new Error("제목은 두 글자 이상 입력해 주세요.");
  }

  if (body.length < 5) {
    throw new Error("조합 설명은 다섯 글자 이상 입력해 주세요.");
  }

  const validated = validateSelection(input.encodedSelection);

  return mutatePostStore(async (store) => {
    const postId = createPostId(store);
    const createdAt = new Date().toISOString();
    const post: BudgetChallengePostRecord = {
      id: postId,
      title,
      body,
      authorId: input.authorId,
      authorNickname: input.authorNickname,
      createdAt,
      encodedSelection: validated.encodedSelection,
      usedBudget: validated.summary.usedBudget,
      slots: validated.slots,
      likeUserIds: [],
      comments: [],
    };

    store.posts.push(post);
    return toPostView(post, input.authorId);
  });
}

export async function toggleBudgetChallengePostLike(input: { postId: string; userId: string }) {
  return mutatePostStore(async (store) => {
    const post = getPostOrThrow(store, input.postId);

    if (post.likeUserIds.includes(input.userId)) {
      post.likeUserIds = post.likeUserIds.filter((userId) => userId !== input.userId);
    } else {
      post.likeUserIds = [...post.likeUserIds, input.userId];
    }

    return toPostView(post, input.userId);
  });
}

export async function addBudgetChallengePostComment(input: {
  postId: string;
  userId: string;
  userNickname: string;
  body: string;
}) {
  const body = input.body.trim();

  if (body.length < 2) {
    throw new Error("댓글은 두 글자 이상 입력해 주세요.");
  }

  if (body.length > 180) {
    throw new Error("댓글은 180자 이하로 입력해 주세요.");
  }

  return mutatePostStore(async (store) => {
    const post = getPostOrThrow(store, input.postId);
    const comment: BudgetChallengeComment = {
      id: createCommentId(store),
      authorId: input.userId,
      authorNickname: input.userNickname,
      body,
      createdAt: new Date().toISOString(),
    };

    post.comments.push(comment);
    return toPostView(post, input.userId);
  });
}
