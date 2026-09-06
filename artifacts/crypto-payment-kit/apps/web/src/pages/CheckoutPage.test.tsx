import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CheckoutPage from "./CheckoutPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRoute } from "wouter";

// Mock wouter
vi.mock("wouter", () => ({
  useRoute: vi.fn(),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock API hooks
vi.mock("../api", () => ({
  usePayment: vi.fn(),
  useSelectRail: vi.fn(),
  useSubmitTransaction: vi.fn(),
}));

import { usePayment, useSelectRail, useSubmitTransaction } from "../api";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useRoute as any).mockReturnValue([true, { publicId: "pay_123" }]);
    (useSelectRail as any).mockReturnValue({ mutate: vi.fn(), isPending: false });
    (useSubmitTransaction as any).mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("renders loading state", () => {
    (usePayment as any).mockReturnValue({ isLoading: true });
    render(<CheckoutPage />, { wrapper: createWrapper() });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders error state when not found", () => {
    (usePayment as any).mockReturnValue({ error: new Error("Not found"), isLoading: false });
    render(<CheckoutPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Payment not found")).toBeInTheDocument();
  });

  it("renders rail selection for 'created' status", () => {
    (usePayment as any).mockReturnValue({
      data: {
        publicId: "pay_123",
        status: "created",
        fiatAmount: "100.00",
        fiatCurrency: "USD",
        allowedRails: [{ id: "ethereum-usdc" }],
        selectedQuote: null,
      },
      isLoading: false,
    });
    
    render(<CheckoutPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Select Payment Method")).toBeInTheDocument();
    expect(screen.getByTestId("btn-select-rail-ethereum-usdc")).toBeInTheDocument();
  });

  it("allows selecting a rail while awaiting payment before a quote exists", () => {
    const mutate = vi.fn();
    (useSelectRail as any).mockReturnValue({ mutate, isPending: false });
    (usePayment as any).mockReturnValue({ data: {
      publicId: "pay_123", status: "awaiting_payment", fiatAmount: "100.00", fiatCurrency: "USD",
      allowedRails: [{ id: "ethereum-usdc" }], selectedQuote: null,
    }, isLoading: false });
    render(<CheckoutPage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("btn-select-rail-ethereum-usdc"));
    expect(mutate).toHaveBeenCalledWith("ethereum-usdc");
  });

  it("renders payment details after rail selected", () => {
    (usePayment as any).mockReturnValue({
      data: {
        publicId: "pay_123",
        status: "awaiting_payment",
        fiatAmount: "100.00",
        fiatCurrency: "USD",
        allowedRails: [{ id: "ethereum-usdc" }],
        selectedQuote: {
          railId: "ethereum-usdc",
          amountBaseUnits: "100000000",
          destinationAddress: "0x123",
        },
      },
      isLoading: false,
    });

    render(<CheckoutPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Amount to send")).toBeInTheDocument();
    expect(screen.getByText("0x123")).toBeInTheDocument();
    expect(screen.getByTestId("input-tx-hash")).toBeInTheDocument();
  });

  it("handles tx submission", async () => {
    const submitMutate = vi.fn();
    (useSubmitTransaction as any).mockReturnValue({ mutate: submitMutate, isPending: false });
    (usePayment as any).mockReturnValue({
      data: {
        publicId: "pay_123",
        status: "awaiting_payment",
        fiatAmount: "100.00",
        fiatCurrency: "USD",
        allowedRails: [{ id: "ethereum-usdc" }],
        selectedQuote: {
          railId: "ethereum-usdc",
          amountBaseUnits: "100000000",
          destinationAddress: "0x123",
        },
      },
      isLoading: false,
    });

    render(<CheckoutPage />, { wrapper: createWrapper() });
    const input = screen.getByTestId("input-tx-hash");
    fireEvent.change(input, { target: { value: "0xabc" } });
    
    const submitBtn = screen.getByTestId("btn-submit-tx");
    fireEvent.click(submitBtn);

    expect(submitMutate).toHaveBeenCalledWith("0xabc");
  });

  it("renders terminal paid screen", () => {
    (usePayment as any).mockReturnValue({
      data: {
        publicId: "pay_123",
        status: "paid",
        fiatAmount: "100.00",
        fiatCurrency: "USD",
        selectedQuote: { railId: "ethereum-usdc" }
      },
      isLoading: false,
    });

    render(<CheckoutPage />, { wrapper: createWrapper() });
    expect(screen.getByText("Payment Successful")).toBeInTheDocument();
  });
});