import { pointerWithin, rectIntersection, type CollisionDetection } from "@dnd-kit/core";

// The pointer identifies the intended column even when most of the dragged card
// still overlaps its old column. Never select a column when released outside it.
export const fulfilmentCollisionDetection: CollisionDetection = args =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
