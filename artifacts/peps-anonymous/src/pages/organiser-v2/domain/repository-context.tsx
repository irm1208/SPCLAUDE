import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { OrderRepository } from "./order-repository.ts";
import type { OrganiserRepositories } from "./repositories.ts";

const RepositoryContext = createContext<OrganiserRepositories | null>(null);

export function OrganiserRepositoryProvider({
  value,
  children,
}: {
  value: OrganiserRepositories;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useOrganiserRepositories(): OrganiserRepositories {
  const repositories = useContext(RepositoryContext);
  if (!repositories) throw new Error("OrganiserRepositoryProvider is required");
  return repositories;
}

export function useOrderRepository(): OrderRepository {
  return useOrganiserRepositories().orders;
}

export function useOrders() {
  const repository = useOrderRepository();
  return useSyncExternalStore(repository.subscribe, repository.getSnapshot, repository.getSnapshot);
}
