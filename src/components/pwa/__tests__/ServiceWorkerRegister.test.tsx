import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

describe("ServiceWorkerRegister", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      serviceWorker: undefined,
    });
  });

  it("renders nothing when service workers are unavailable", () => {
    const { container } = render(<ServiceWorkerRegister />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("pwa-update-button")).not.toBeInTheDocument();
  });
});
