import { AnyObject } from ".";

export type SupersetLoginRequest = {
  username: string;
  password: string;
  provider: string;
};

export type SupersetLoginResponse = {
  access_token: string;
};

export type SupersetChartDataRequest = {
  datasource: {
    id: string;
    type: string;
  };
  queries: Array<{
    columns: string[];
    orderby: string[];
    metrics: string[];
    filters: string[];
    granularity: string;
  }>;
};

export type SupersetChartDataResponse = {
  result: Array<{
    cache_key: string;
    cached_dttm: string | null;
    cache_timeout: number;
    applied_template_filters: AnyObject[]; // If structure of filters is known, adjust this type
    annotation_data: Record<string, AnyObject>;
    error: string | null;
    is_cached: boolean | null;
    query: string;
    status: "success" | "error"; // Assuming possible values
    stacktrace: string | null;
    rowcount: number;
    sql_rowcount: number;
    from_dttm: string | null;
    to_dttm: string | null;
    label_map: Record<string, string[]>;
    colnames: string[];
    indexnames: number[];
    coltypes: number[]; // Assuming these are numeric codes for column types
    data: AnyObject[]; // Adjust if the data structure is known
    result_format: "json" | "csv" | "excel" | "sql" | "db"; // Assuming possible formats
    applied_filters: AnyObject[]; // Adjust if structure is known
    rejected_filters: AnyObject[]; // Adjust if structure is known
  }>;
};

export type SupersetDatasetColumn = {
  column_name: string;
};

export type SupersetDatasetResponse = {
  result: {
    columns: SupersetDatasetColumn[];
  };
};
