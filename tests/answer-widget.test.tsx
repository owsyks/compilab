// @vitest-environment jsdom
import React from "react";
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AnswerWidget } from "../src/components/exercise-workspace";
import { PublicExercise } from "../src/lib/exercise-types";
const exercise: PublicExercise = {
  id: "test",
  topic: "ll1",
  type: "FOLLOW_sets",
  difficulty: 2,
  provenance: "test",
  title: "FOLLOW",
  titleEn: "FOLLOW",
  statement: "Compute",
  statementEn: "Compute",
  widget: "set",
  hints: [],
  rubric: "Set",
  objective: "Sets",
  prerequisites: [],
};
it("provides a labeled set answer and reports edits", () => {
  const onChange = vi.fn();
  render(<AnswerWidget exercise={exercise} value="" onChange={onChange} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), {
    target: { value: "+, $" },
  });
  expect(onChange).toHaveBeenCalledWith("+, $");
  cleanup();
});
it("uses an accessible choice widget instead of a generic textarea", () => {
  const onChange = vi.fn();
  render(
    <AnswerWidget
      exercise={{ ...exercise, widget: "choice", options: ["A", "B"] }}
      value="A"
      onChange={onChange}
    />,
  );
  fireEvent.click(screen.getByRole("radio", { name: "B" }));
  expect(onChange).toHaveBeenCalledWith("B");
  cleanup();
});
