export const ActivityEvents = {
  account: {
    created: "account.created",
    profileUpdated: "account.profile_updated",
    statusChanged: "account.status_changed",
    tagsUpdated: "account.tags_updated",
    notesUpdated: "account.notes_updated",
  },
  order: {
    created: "order.created",
    updated: "order.updated",
    deleted: "order.deleted",
    statusChanged: "order.status_changed",
    cancelled: "order.cancelled",
    refundProcessed: "order.refund_processed",
    paymentSubmitted: "order.payment_submitted",
    paymentApproved: "order.payment_approved",
    paymentRejected: "order.payment_rejected",
    trackingAdded: "order.tracking_added",
    adminNotesUpdated: "order.admin_notes_updated",
    adminMessageSent: "order.admin_message_sent",
  },
  groupBuy: {
    joined: "group_buy.joined",
    left: "group_buy.left",
    testVoteSubmitted: "group_buy.test_vote_submitted",
  },
  glp1: {
    shotLogged: "glp1.shot_logged",
    shotUpdated: "glp1.shot_updated",
    shotDeleted: "glp1.shot_deleted",
  },
  compound: {
    logCreated: "compound.log_created",
    logUpdated: "compound.log_updated",
    logEnded: "compound.log_ended",
    logDeleted: "compound.log_deleted",
  },
  bloodTest: {
    sessionCreated: "blood_test.session_created",
    resultsUploaded: "blood_test.results_uploaded",
    sessionDeleted: "blood_test.session_deleted",
    aiDiscussionMessage: "blood_test.ai_discussion_message",
  },
} as const;

export const ADMIN_ONLY_EVENT_TYPES = [
  ActivityEvents.account.statusChanged,
  ActivityEvents.account.tagsUpdated,
  ActivityEvents.account.notesUpdated,
  ActivityEvents.order.adminNotesUpdated,
  ActivityEvents.order.adminMessageSent,
] as const;
