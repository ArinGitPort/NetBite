import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Assets } from "@/features/media/media-page";

const { getAssets, getCurriculum } = vi.hoisted(() => ({
  getAssets: vi.fn(),
  getCurriculum: vi.fn(),
}));

vi.mock("@/lib/api/media-service", () => ({
  deleteAsset: vi.fn(),
  getAssets,
  uploadAsset: vi.fn(),
}));

vi.mock("@/lib/api/curriculum-service", () => ({ getCurriculum }));

describe("media attachments", () => {
  afterEach(cleanup);

  beforeEach(() => {
    getAssets.mockReset();
    getCurriculum.mockReset();
    getCurriculum.mockResolvedValue({ lessons: [] });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:selected-image"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  test("shows a loading clue while media records are fetched", () => {
    getAssets.mockReturnValue(new Promise(() => undefined));

    render(<Assets />);

    expect(screen.getByRole("status", { name: "Loading media records" })).toBeInTheDocument();
    expect(screen.queryByText("No supporting images")).not.toBeInTheDocument();
  });

  test("renders saved media as an attachment and opens a full preview", async () => {
    getAssets.mockResolvedValue([
      {
        id: "asset-1",
        object_path: "drafts/topology.png",
        mime_type: "image/png",
        byte_size: 840_000,
        width: 1600,
        height: 900,
        alt_text: "Router topology",
        published: false,
        preview_url: "https://example.test/topology.png",
      },
    ]);

    render(<Assets />);

    const preview = await screen.findByRole("button", { name: "Preview Router topology" });
    expect(screen.getByText("Draft · PNG · 820 KB · 1600 × 900")).toBeInTheDocument();

    fireEvent.click(preview);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Router topology" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Router topology" })).toHaveAttribute(
      "src",
      "https://example.test/topology.png",
    );

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("previews a selected image before it is uploaded", async () => {
    getAssets.mockResolvedValue([]);
    render(<Assets />);
    await screen.findByText("No supporting images");

    const file = new File(["image data"], "router-lab.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText(/Image file/), {
      target: { files: [file] },
    });

    const preview = await screen.findByRole("button", {
      name: "Preview router-lab.png",
    });
    expect(screen.getByText("PNG · 1 KB")).toBeInTheDocument();

    fireEvent.click(preview);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "router-lab.png" })).toHaveAttribute(
      "src",
      "blob:selected-image",
    );
  });
});
