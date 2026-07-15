import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("opens on MiMo-V2-Pro blocked, because the default intent includes self-hosting", async () => {
    render(<App />);
    expect(screen.getByTestId("stamp")).toHaveTextContent("Blocked");
    expect(screen.getByText("No weights to host")).toBeInTheDocument();
  });

  it("switches the verdict when a different model is picked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Phi-4/ }));
    expect(screen.getByRole("heading", { name: "Phi-4" })).toBeInTheDocument();
  });

  it("recomputes when the intent changes: dropping self-host unblocks MiMo", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId("stamp")).toHaveTextContent("Blocked");
    await user.click(screen.getByLabelText("Self-host the weights"));
    expect(screen.getByTestId("stamp")).toHaveTextContent("Conditions apply");
  });

  it("drops the EU AI Act finding when EU users are not served", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Llama 3.1 405B/ }));
    expect(screen.getByText(/Systemic-risk GPAI/)).toBeInTheDocument();
    await user.click(screen.getByLabelText("Serve EU users"));
    expect(screen.queryByText(/Systemic-risk GPAI/)).not.toBeInTheDocument();
  });

  it("renders a source link on every finding", () => {
    render(<App />);
    const links = screen.getAllByRole("link", { name: "source" });
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l).toHaveAttribute("href", expect.stringMatching(/^https:\/\//));
  });

  it("shows the not-legal-advice disclaimer", () => {
    render(<App />);
    expect(screen.getByText(/Not legal advice/)).toBeInTheDocument();
  });

  it("labels each fact as verified or reported", () => {
    render(<App />);
    const verdict = screen.getByLabelText(/Passport for/);
    const badges = within(verdict).getAllByText(/^(verified|reported)$/);
    expect(badges.length).toBeGreaterThan(0);
  });
});
