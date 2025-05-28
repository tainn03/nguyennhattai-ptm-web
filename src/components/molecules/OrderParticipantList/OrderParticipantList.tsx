import clsx from "clsx";
import { useTranslations } from "next-intl";

import { SkeletonTableRow, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { EmptyListSection, OrderParticipantListItem } from "@/components/molecules";
import { OrderParticipantInfo } from "@/types/strapi";

type OrderParticipantListProps = {
  loading?: boolean;
  data: Partial<OrderParticipantInfo>[];
  onUpdate?: (value: Partial<OrderParticipantInfo>) => void;
  onCreate?: (value: Partial<OrderParticipantInfo>) => void;
  className?: string;
};

const OrderParticipantList = ({ loading, data, className, ...otherProps }: OrderParticipantListProps) => {
  const t = useTranslations();
  return (
    <TableContainer fullHeight inside variant="paper" className={clsx("!mt-0", className)}>
      <Table dense>
        <TableHead uppercase>
          <TableRow>
            <TableCell>{t("components.order_participant_list.account")}</TableCell>
            <TableCell>{t("components.order_participant_list.role")}</TableCell>
            <TableCell>{t("components.order_participant_list.access")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && data.length === 0 && <SkeletonTableRow rows={5} columns={3} profileColumnIndexes={[0]} />}
          {!loading && data.length === 0 && (
            <TableRow hover={false} className="mx-auto max-w-lg">
              <TableCell colSpan={3} className="px-6 lg:px-8">
                <EmptyListSection description={t("components.order_participant_list.empty_list_description")} />
              </TableCell>
            </TableRow>
          )}
          {data.map((item) => (
            <OrderParticipantListItem key={item.id} value={item} {...otherProps} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrderParticipantList;
