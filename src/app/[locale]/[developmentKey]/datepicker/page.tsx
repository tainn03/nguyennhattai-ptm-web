"use client";

import ja from "date-fns/locale/ja";
import vi from "date-fns/locale/vi";
import { useState } from "react";
import { registerLocale } from "react-datepicker";

import { DatePicker, PageHeader } from "@/components/molecules";

registerLocale("ja", ja);
registerLocale("vi", vi);

export default function Page() {
  const [selectedDate1, setSelectedDate1] = useState<Date | null>();
  const [selectedDate2, setSelectedDate2] = useState<Date | null>();
  const [selectedDate3, setSelectedDate3] = useState<Date | null>();
  const [selectedDate4, setSelectedDate4] = useState<Date | null>();
  const [selectedDate5, setSelectedDate5] = useState<Date | null>();
  const [selectedDate6, setSelectedDate6] = useState<Date | null>();
  const [selectedDate7, setSelectedDate7] = useState<Date | null>();
  const [selectedDate8, setSelectedDate8] = useState<Date | null>();
  const [selectedDate9, setSelectedDate9] = useState<Date | null>();
  const [selectedDate10, setSelectedDate10] = useState<Date | null>();

  const [selectedDate11, setSelectedDate11] = useState<Date | null>();
  const [selectedDate12, setSelectedDate12] = useState<Date | null>();
  const [selectedDate13, setSelectedDate13] = useState<Date | null>();
  const [selectedDate14, setSelectedDate14] = useState<Date | null>();
  const [selectedDate15, setSelectedDate15] = useState<Date | null>();
  const [selectedDate16, setSelectedDate16] = useState<Date | null>();
  const [selectedDate17, setSelectedDate17] = useState<Date | null>();
  const [selectedDate18, setSelectedDate18] = useState<Date | null>();
  const [selectedDate19, setSelectedDate19] = useState<Date | null>();
  const [selectedDate20, setSelectedDate20] = useState<Date | null>();

  return (
    <div>
      <PageHeader title="DatePicker component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <div className="grid grid-cols-5 gap-6">
            <DatePicker label="Normal" selected={selectedDate1} onChange={(date) => setSelectedDate1(date)} />
            <DatePicker
              showIcon={false}
              label="showIcon = false"
              selected={selectedDate2}
              onChange={(date) => setSelectedDate2(date)}
            />
            <DatePicker
              allowInput={false}
              label="allowInput = false"
              selected={selectedDate3}
              onChange={(date) => setSelectedDate3(date)}
            />
            <DatePicker
              alwaysShowMask={false}
              label="alwaysShowMask = false"
              selected={selectedDate4}
              onChange={(date) => setSelectedDate4(date)}
            />
            <DatePicker
              label="Mask character"
              maskChar="-"
              selected={selectedDate5}
              onChange={(date) => setSelectedDate5(date)}
            />
            <DatePicker
              label="Placeholder"
              selected={selectedDate6}
              placeholder="Placeholder"
              onChange={(date) => setSelectedDate6(date)}
            />
            <DatePicker
              required
              label="Required"
              selected={selectedDate7}
              onChange={(date) => setSelectedDate7(date)}
            />
            <DatePicker
              disabled
              label="Disabled"
              placeholder="Đây là trường vô hiệu hóa"
              onChange={(date) => setSelectedDate8(date)}
            />
            <DatePicker
              dateFormat="yyyy/MM/dd"
              mask="9999/99/99"
              label="Localization (en)"
              selected={selectedDate8}
              onChange={(date) => setSelectedDate8(date)}
            />
            <DatePicker
              label="Localization (vi)"
              locale="vi"
              selected={selectedDate8}
              onChange={(date) => setSelectedDate8(date)}
            />
            <DatePicker
              dateFormat="yyyy/MM/dd"
              mask="9999/99/99"
              label="Localization (ja)"
              locale="ja"
              selected={selectedDate8}
              onChange={(date) => setSelectedDate8(date)}
            />
            <DatePicker
              label="Helper Text"
              selected={selectedDate9}
              onChange={(date) => setSelectedDate9(date)}
              helperText="Nhập ngày tháng năm sinh của bạn"
            />
            <DatePicker
              label="Helper Text"
              selected={selectedDate10}
              onChange={(date) => setSelectedDate10(date)}
              errorText="Nhập ngày tháng năm sinh của bạn"
            />
          </div>

          <div className="grid grid-cols-5 gap-6">
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              label="Normal"
              selected={selectedDate11}
              onChange={(date) => setSelectedDate11(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              showIcon={false}
              label="showIcon = false"
              selected={selectedDate12}
              onChange={(date) => setSelectedDate12(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              allowInput={false}
              label="allowInput = false"
              selected={selectedDate13}
              onChange={(date) => setSelectedDate13(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              alwaysShowMask={false}
              label="alwaysShowMask = false"
              selected={selectedDate14}
              onChange={(date) => setSelectedDate14(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              label="Mask character"
              maskChar="-"
              selected={selectedDate15}
              onChange={(date) => setSelectedDate15(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              label="Placeholder"
              placeholder="Placeholder"
              selected={selectedDate16}
              onChange={(date) => setSelectedDate16(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              required
              label="Required"
              selected={selectedDate17}
              onChange={(date) => setSelectedDate17(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              disabled
              label="Disabled"
              placeholder="Đây là trường vô hiệu hóa"
              onChange={(date) => setSelectedDate18(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="9999/99/99 99:99"
              showTimeSelect
              label="Localization (en)"
              selected={selectedDate18}
              onChange={(date) => setSelectedDate18(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              locale={vi}
              label="Localization (vi)"
              selected={selectedDate18}
              onChange={(date) => setSelectedDate18(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="9999/99/99 99:99"
              showTimeSelect
              locale="ja"
              label="Localization (ja)"
              selected={selectedDate18}
              onChange={(date) => setSelectedDate18(date)}
            />
            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              label="Helper Text"
              selected={selectedDate19}
              onChange={(date) => setSelectedDate19(date)}
              helperText="Nhập ngày tháng năm sinh của bạn"
            />

            <DatePicker
              dateFormat="dd/MM/yyyy HH:mm"
              mask="99/99/9999 99:99"
              showTimeSelect
              label="Helper Text"
              selected={selectedDate20}
              onChange={(date) => setSelectedDate20(date)}
              errorText="Nhập ngày tháng năm sinh của bạn"
            />
            <DatePicker
              dateFormat="yyyy/MM/dd HH:mm"
              mask="9999/99/99 99:99"
              showTimeSelect
              label="Localization (ja)"
              locale="ja-JP"
              selected={selectedDate20}
              onChange={(date) => setSelectedDate20(date)}
              errorText="Nhập ngày tháng năm sinh của bạn"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
