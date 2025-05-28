import { useTranslations } from "next-intl";
import React from "react";

type TruncatedListProps = {
  items: string[];
  maxVisible?: number;
};

const TruncatedList: React.FC<TruncatedListProps> = ({ items, maxVisible = 2 }) => {
  const t = useTranslations();
  return (
    <div className="group relative w-[240px]">
      <div className="overflow-hidden">
        {items.length > 0 ? (
          <>
            {items.slice(0, maxVisible).map((item, index) => (
              <div key={index} className="overflow-hidden truncate text-ellipsis whitespace-nowrap">
                {item}
              </div>
            ))}
            {items.length > maxVisible && <div className="truncate">...</div>}
          </>
        ) : (
          <div>{t("common.empty")}</div>
        )}
      </div>

      {items.length > maxVisible && (
        <div className="absolute left-0 top-full z-[999] mt-1 hidden w-max max-w-[300px] rounded-lg bg-white p-2 shadow-lg group-hover:block">
          {items.slice(maxVisible).map((item, index) => (
            <div key={index} className="whitespace-nowrap">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TruncatedList;
