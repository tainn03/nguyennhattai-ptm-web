"use client";

import { useState } from "react";

import { PageHeader, Select } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { SelectItem } from "@/components/molecules/Select/Select";
import { ensureString } from "@/utils/string";

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

const ACCOUNT_OPTIONS: SelectItem[] = [
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
  const [value1, setValue1] = useState<string>();
  const [value2, setValue2] = useState<string>();
  const [value3, setValue3] = useState<string>();
  const [value4, setValue4] = useState<string>();
  const [value5, setValue5] = useState<string>();
  const [value6, setValue6] = useState<string>();

  return (
    <div>
      <PageHeader title="Select component" actionHorizontal />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-1">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Placeholder</h2>
          <div className="flex w-1/3 flex-col items-start justify-start gap-x-1">
            <Select
              label="No placeholder"
              items={YEARS}
              value={ensureString(value1)}
              onChange={(value: string) => {
                setValue1(value);
              }}
            />
            <Select
              label="Width placeholder"
              items={YEARS}
              value={ensureString(value2)}
              onChange={(value: string) => {
                setValue2(value);
              }}
              placeholder="Vui lòng chọn năm sản xuất"
            />
            <Select
              label="Required"
              required
              items={YEARS}
              value={ensureString(value3)}
              onChange={(value: string) => {
                setValue3(value);
              }}
            />
            <Select
              label="With subLabel"
              items={DRIVERS}
              value={ensureString(value4)}
              onChange={(value: string) => {
                setValue4(value);
              }}
              placeholder="Vui lòng chọn tài xế"
            />
            <Select
              label="With avatar"
              items={ACCOUNT_OPTIONS}
              value={ensureString(value5)}
              onChange={(value: string) => {
                setValue4(value);
              }}
              placeholder="Vui lòng chọn tài khoản"
            />
            <Select
              label="Helper text"
              items={ACCOUNT_OPTIONS}
              value={ensureString(value5)}
              onChange={(value: string) => {
                setValue5(value);
              }}
              placeholder="Vui lòng chọn tài khoản"
              helperText="Chọn tài khoản cần liên kết"
            />
            <Select
              label="Error text"
              items={ACCOUNT_OPTIONS}
              value={ensureString(value6)}
              onChange={(value: string) => {
                setValue6(value);
              }}
              placeholder="Vui lòng chọn tài khoản"
              errorText="Hãy chọn một tài khoản"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
