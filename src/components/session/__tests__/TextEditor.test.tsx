import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { TextEditor } from "../TextEditor";

describe("TextEditor", () => {
  it("value を表示し、onChange で呼び出し側に値を返す", () => {
    const handleChange = vi.fn();

    render(
      <TextEditor
        value="初期テキスト"
        onChange={handleChange}
        ariaLabel="テキストメモ入力"
      />
    );

    const textarea = screen.getByLabelText(
      "テキストメモ入力"
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe("初期テキスト");

    fireEvent.change(textarea, { target: { value: "変更後のテキスト" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("変更後のテキスト");
  });

  it("disabled のときに textarea が disabled 属性を持つ", () => {
    const handleChange = vi.fn();

    render(
      <TextEditor
        value=""
        onChange={handleChange}
        ariaLabel="テキストメモ入力"
        disabled
      />
    );

    const textarea = screen.getByLabelText(
      "テキストメモ入力"
    ) as HTMLTextAreaElement;
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute("disabled");
  });

  it("placeholder が表示される", () => {
    const handleChange = vi.fn();

    render(
      <TextEditor
        value=""
        onChange={handleChange}
        ariaLabel="テキストメモ入力"
        placeholder="プレースホルダテキスト"
      />
    );

    const textarea = screen.getByPlaceholderText("プレースホルダテキスト");
    expect(textarea).toBeInTheDocument();
  });

  it("デフォルトの placeholder が設定されている", () => {
    const handleChange = vi.fn();

    render(<TextEditor value="" onChange={handleChange} />);

    const textarea = screen.getByPlaceholderText(
      "思いつくことを自由に書き出してみましょう"
    );
    expect(textarea).toBeInTheDocument();
  });

  it("maxLength が設定されている場合、textarea に反映される", () => {
    const handleChange = vi.fn();

    render(
      <TextEditor
        value=""
        onChange={handleChange}
        ariaLabel="テキストメモ入力"
        maxLength={100}
      />
    );

    const textarea = screen.getByLabelText(
      "テキストメモ入力"
    ) as HTMLTextAreaElement;
    expect(textarea).toHaveAttribute("maxLength", "100");
  });

  it("className が適用される", () => {
    const handleChange = vi.fn();

    const { container } = render(
      <TextEditor
        value=""
        onChange={handleChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
