import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("opens on the Steam bug so the point lands immediately", () => {
    render(<App />);
    expect(screen.getByLabelText("command")).toHaveValue('rm -rf "$STEAMROOT/"*');
    expect(screen.getByText("CATASTROPHIC")).toBeInTheDocument();
  });

  it("shows the typed command next to the command that actually runs", () => {
    render(<App />);
    expect(screen.getByText("rm -rf /*")).toBeInTheDocument();
    expect(screen.getByText("what runs")).toBeInTheDocument();
  });

  it("re-simulates as the user types", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByLabelText("command");
    await user.clear(input);
    await user.type(input, "ls -la");
    expect(screen.getByText("SAFE")).toBeInTheDocument();
  });

  it("does not cry wolf when the command is genuinely fine", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Free up some space" }));
    expect(screen.getByText("CAUTION")).toBeInTheDocument();
    expect(screen.queryByText("CATASTROPHIC")).not.toBeInTheDocument();
  });

  it("says UNKNOWN rather than SAFE for a command it cannot model", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByLabelText("command");
    await user.clear(input);
    await user.type(input, "terraform destroy");
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
    expect(screen.queryByText("SAFE")).not.toBeInTheDocument();
  });

  it("loads an example when its button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Clean the workspace" }));
    expect(screen.getByLabelText("command")).toHaveValue("git clean -xdf");
  });

  it("offers a safer rewrite for a destructive command", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText("Safer")).toBeInTheDocument();
    // Match the code block specifically — the prose note mentions stash too.
    expect(screen.getByText(/^git stash --include-untracked/)).toBeInTheDocument();
  });

  it("carries the disclaimer that it is not a policy gate", () => {
    render(<App />);
    expect(screen.getByText(/not a guarantee/i)).toBeInTheDocument();
  });
});
