"use client";

import { useState } from "react";

import { Combobox, PageHeader } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { SelectItem } from "@/components/molecules/Select/Select";

const DRIVERS: ComboboxItem[] = [
  { value: "1", subLabel: "34B-234423", label: "Nguyễn Văn An" },
  { value: "2", subLabel: "34C-345678", label: "Nguyễn Văn Bình" },
  { value: "3", subLabel: "34D-123456", label: "Nguyễn Văn Chương" },
  { value: "4", subLabel: "34E-987654", label: "Nguyễn Văn Duy" },
  { value: "5", subLabel: "34F-555555", label: "Nguyễn Văn Em" },
  { value: "6", subLabel: "34G-666666", label: "Nguyễn Văn Phú" },
  { value: "7", subLabel: "34H-777777", label: "Nguyễn Văn Gánh" },
  { value: "8", subLabel: "34I-888888", label: "Nguyễn Văn Hậu" },
  { value: "9", subLabel: "34K-999999", label: "Nguyễn Văn In" },
  { value: "10", subLabel: "34L-000000", label: "Nguyễn Văn Jack" },
];

const ACCOUNT_OPTIONS: ComboboxItem[] = [
  {
    label: "Lindsay Walton",
    subLabel: "0253 435 654",
    value: "lindsay_walton",
    imageSrc: "https://i.pravatar.cc/40?u=1",
  },
  {
    label: "Wade Cooper",
    subLabel: "0998 765 321",
    value: "wade_cooper",
    imageSrc: "https://i.pravatar.cc/40?u=2",
  },
  {
    label: "Arlene Mccoy",
    subLabel: "0123 457 801",
    value: "arlene_mccoy",
    imageSrc: "https://i.pravatar.cc/40?u=3",
  },
  {
    label: "Devon Webb",
    subLabel: "0123 467 891",
    value: "devon_webb",
    imageSrc: "https://i.pravatar.cc/40?u=4",
  },
  {
    label: "Tom Cook",
    subLabel: "0123 457 801",
    value: "tom_cook",
    imageSrc: "https://i.pravatar.cc/40?u=5",
  },
  {
    label: "Tanya Fox",
    subLabel: "0123 457 891",
    value: "tanya_fox",
    imageSrc: "https://i.pravatar.cc/40?u=6",
  },
  {
    label: "Hellen Schmidt",
    subLabel: "0123 457 891",
    value: "hellen_schmidt",
    imageSrc: "https://i.pravatar.cc/40?u=7",
  },
  {
    label: "Caroline Schultz",
    subLabel: "0123 457 801",
    value: "caroline_schultz",
    imageSrc: "https://i.pravatar.cc/40?u=8",
  },
  {
    label: "Mason Heaney",
    subLabel: "0123 467 801",
    value: "mason_heaney",
    imageSrc: "https://i.pravatar.cc/40?u=9",
  },
  {
    label: "Claudie Smitham",
    subLabel: "0123 467 801",
    value: "claudie_smitham",
    imageSrc: "https://i.pravatar.cc/40?u=10",
  },
  {
    label: "Emil Schaefer",
    subLabel: "0123 457 801",
    value: "emil_schaefer",
    imageSrc: "https://i.pravatar.cc/40?u=11",
  },
];

const YEARS: SelectItem[] = Array.from({ length: new Date().getFullYear() - 1800 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { label: year.toString(), value: year.toString() };
});

export default function Page() {
  const [value1, setValue1] = useState(YEARS[0].value);
  const [value2, setValue2] = useState(YEARS[0].value);
  const [value3, setValue3] = useState(DRIVERS[0].value);
  const [value4, setValue4] = useState(ACCOUNT_OPTIONS[0].value);
  const [value5, setValue5] = useState(ACCOUNT_OPTIONS[0].value);
  const [value6, setValue6] = useState(ACCOUNT_OPTIONS[0].value);
  const [value7, setValue7] = useState(ACCOUNT_OPTIONS[0].value);

  return (
    <div>
      <PageHeader title="Combobox component" actionHorizontal />

      <div className="mt-10 grid gap-x-4 gap-y-6 md:max-w-lg">
        <div className="flex flex-col gap-y-4 sm:col-span-1">
          <div className="flex flex-col items-start justify-start gap-6">
            <Combobox
              label="Create and mange button"
              items={ACCOUNT_OPTIONS}
              value={value5}
              onChange={setValue5}
              placeholder="Vui lòng chọn tài khoản"
              newButtonText="Thêm tài khoản"
              onNewButtonClick={() => {
                console.log("onAdd");
              }}
              manageButtonText="Quản lý tài khoản"
              onManageButtonClick={() => {
                console.log("onManage");
              }}
            />
            <Combobox label="Normal" items={YEARS} value={value1} onChange={setValue1} />
            <Combobox
              label="Placeholder"
              items={YEARS}
              value={value2}
              onChange={setValue2}
              placeholder="Vui lòng chọn năm sản xuất"
            />
            <Combobox
              label="With sup label"
              items={DRIVERS}
              value={value3}
              onChange={setValue3}
              placeholder="Vui lòng chọn tài xế"
            />
            <Combobox
              label="With avatar"
              items={ACCOUNT_OPTIONS}
              value={value4}
              onChange={setValue4}
              placeholder="Vui lòng chọn tài khoản"
            />
            <Combobox
              label="With avatar"
              items={ACCOUNT_OPTIONS}
              value={value6}
              onChange={setValue6}
              helperText="Chọn tài khoản cần liên kết"
            />
            <Combobox
              label="With avatar"
              items={ACCOUNT_OPTIONS}
              value={value7}
              onChange={setValue7}
              errorText="Hãy chọn một tài khoản"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
