import type { AssetKind } from "../types";

export interface AssetGenerationRequest {
  prompt: string;
  kind: AssetKind;
  /** Context the model should work from, e.g. the account name. */
  account: string;
}

export interface GeneratedAsset {
  name: string;
  mimeType: string;
  blob: Blob;
}

export interface AssetGenerationProvider {
  readonly id: string;
  /** False while the model call is stubbed out; the UI disables generation. */
  readonly live: boolean;
  generate(request: AssetGenerationRequest): Promise<GeneratedAsset>;
}

export class AssetGenerationError extends Error {}

/**
 * Placeholder for model-built assets.
 *
 * Deliberately not mocked: fabricating an image here would put a fake artifact
 * in the library that looks real and could be attached to a room. It stays
 * disabled until there is a backend route that holds the API key and calls
 * Claude server-side — the key must never reach the browser.
 */
const DISCONNECTED_PROVIDER: AssetGenerationProvider = {
  id: "disconnected",
  live: false,
  async generate() {
    throw new AssetGenerationError(
      "Asset generation isn't connected yet. Wire the Claude API route to enable it.",
    );
  },
};

/** Swap for the live provider once the generation route exists. */
export const assetGenerationProvider: AssetGenerationProvider = DISCONNECTED_PROVIDER;
