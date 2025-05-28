"use client";

import debounce from "lodash/debounce";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageListItem } from "@/components/molecules";
import { OrderTripMessage } from "@/components/organisms/MessageModal/MessageModal";
import { useAuth } from "@/hooks";
import { updateUsersReadMessage } from "@/services/client/orderTripMessage";
import { formatDate } from "@/utils/date";
import { equalId } from "@/utils/number";

type MessageListProps = {
  data: OrderTripMessage[];
  open: boolean;
  onScrollNew: () => void;
  onReload: () => Promise<void>;
};

const MessageList = ({ data, open, onScrollNew, onReload }: MessageListProps) => {
  let date = "";
  const endMessageRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [lastData, setLastData] = useState<OrderTripMessage>();
  const { userId } = useAuth();

  /**
   * Mark as read the last message
   */
  const handleMarkAsReadLastMessage = useCallback(async () => {
    const notSystemMessages = data.filter((item) => !item.isSystem);
    if (notSystemMessages.length < 1) {
      return;
    }

    const lastNotSystemMessage = notSystemMessages[notSystemMessages.length - 1];
    if (!lastNotSystemMessage.readByUsers) {
      return;
    }

    const findResult = lastNotSystemMessage.readByUsers.find((item) => equalId(item.id, userId));
    if (!findResult) {
      const readByUserIds = lastNotSystemMessage.readByUsers.map((item) => Number(item.id));
      readByUserIds.push(Number(userId));

      const result = await updateUsersReadMessage(
        { id: lastNotSystemMessage.messageId, updatedByUser: { id: userId } },
        readByUserIds
      );

      if (result) {
        await onReload();
      }
    }
  }, [data, onReload, userId]);

  /**
   * Scroll event
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleScroll = useCallback(
    debounce(async () => {
      if (!divRef.current) {
        return;
      }

      // Check if scroll to last item
      const listItems = divRef.current.querySelectorAll("li");
      if (listItems.length > 0) {
        const lastListItem = listItems[listItems.length - 1];

        if (lastListItem) {
          const containerRect = divRef.current.getBoundingClientRect();
          const lastItemRect = lastListItem.getBoundingClientRect();
          const isLastItemVisible =
            lastItemRect.top >= containerRect.top && lastItemRect.bottom <= containerRect.bottom + 10;

          if (isLastItemVisible) {
            // If last message is not read before, mark as read it
            await handleMarkAsReadLastMessage();
          }
        }
      }

      // Scroll more old message
      if (divRef.current.scrollTop === 0) {
        onScrollNew();
      }
    }, 200),
    [onReload, onScrollNew, userId]
  );

  /**
   * Add scroll event to message list
   */
  useEffect(() => {
    const scrollRef = divRef.current;
    if (scrollRef) {
      scrollRef.addEventListener("scroll", handleScroll);
    }

    // Remove event
    return () => {
      if (scrollRef) {
        scrollRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  /**
   * Set last message to scroll bottom when send or have new message
   */
  useEffect(() => {
    if (data && data.length > 0) {
      const lastMessage = data[data.length - 1];

      if (
        (lastMessage.createdAt !== lastData?.createdAt || lastMessage.message !== lastData?.message) &&
        equalId(lastMessage.createdByUser?.id, userId)
      ) {
        setLastData(lastMessage);
      }

      const divElement = divRef.current;

      if (divElement && !(divElement.scrollHeight > divElement.clientHeight)) {
        handleMarkAsReadLastMessage();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  /**
   * Scroll to bottom when send message
   */
  useEffect(() => {
    if (endMessageRef?.current && open) {
      endMessageRef.current.scrollIntoView();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastData, open]);

  return (
    <div ref={divRef} className="flex-1 overflow-y-auto">
      <div className="p-4 lg:col-start-3">
        {/* Activity feed */}
        <div role="list" className="flex flex-col space-y-6">
          {data.map((item, index) => {
            const msgDate = formatDate(item.createdAt);
            const isOtherDate = msgDate !== date;

            if (msgDate !== date) {
              date = msgDate;
            }

            return (
              <MessageListItem
                data={item}
                key={index}
                isLastItem={index === data.length - 1}
                date={msgDate}
                isOtherDate={isOtherDate}
              />
            );
          })}
          <div ref={endMessageRef} />
        </div>
      </div>
    </div>
  );
};

export default MessageList;
