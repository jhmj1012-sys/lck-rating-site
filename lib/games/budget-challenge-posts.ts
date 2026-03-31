import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { budgetChallengeConfig, budgetChallengePlayers } from "@/lib/games/budget-challenge-data";
import type { BudgetChallengePost, BudgetChallengePostSlot, ChallengeSelection } from "@/lib/games/budget-challenge-types";
import { createChallengeSummary, decodeSelection, encodeSelection } from "@/lib/games/budget-challenge-utils";

const postsDirectory = path.join(process.cwd(), "data");
const postsPath = path.join(postsDirectory, "budget-challenge-posts.json");

type BudgetChallengePostStore = {
  posts: BudgetChallengePost[];
  nextIds: Record<string, number>;
};

let mutationQueue = Promise.resolve();

function createPostId(store: BudgetChallengePostStore) {
  const nextValue = store.nextIds.posts ?? 1;
  store.nextIds.posts = nextValue + 1;
  return `budget_post_${nextValue}`;
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
    throw new Error("완성된 조합만 저장할 수 있습니다.");
  }

  return {
    encodedSelection: encodeSelection(selection),
    summary,
    slots: buildSlots(selection),
  };
}

async function ensurePostStore(): Promise<BudgetChallengePostStore> {
  try {
    const content = await readFile(postsPath, "utf8");
    const parsed = JSON.parse(content) as Partial<BudgetChallengePostStore>;

    return {
      posts: parsed.posts ?? [],
      nextIds: parsed.nextIds ?? { posts: 1 },
    };
  } catch {
    const initialStore = { posts: [], nextIds: { posts: 1 } };
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

export async function listBudgetChallengePosts() {
  const store = await ensurePostStore();

  return store.posts
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    throw new Error("게시글 설명은 다섯 글자 이상 입력해 주세요.");
  }

  const validated = validateSelection(input.encodedSelection);

  return mutatePostStore(async (store) => {
    const postId = createPostId(store);
    const createdAt = new Date().toISOString();
    const post: BudgetChallengePost = {
      id: postId,
      title,
      body,
      authorId: input.authorId,
      authorNickname: input.authorNickname,
      createdAt,
      encodedSelection: validated.encodedSelection,
      usedBudget: validated.summary.usedBudget,
      slots: validated.slots,
    };

    store.posts.push(post);
    return post;
  });
}
