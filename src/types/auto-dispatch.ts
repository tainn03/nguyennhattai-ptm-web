export type AutoDispatch = {
  [key: string]: PriorityItem;
};

export type PriorityItem = {
  priority: number;
  ascending: boolean;
  is_active: boolean;
  period?: Period;
};

export type Period = {
  type: string;
  value: number;
};
