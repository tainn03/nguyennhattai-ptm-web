"use client";

export type SkeletonTableRowProps = {
  columns: number;
  rows: number;
  profileColumnIndexes?: number[];
  multilineColumnIndexes?: number[];
};

const SkeletonTableRow = ({
  columns,
  rows,
  profileColumnIndexes = [],
  multilineColumnIndexes = [],
}: SkeletonTableRowProps) => {
  return (
    <>
      {Array.from({ length: rows }, (_row, rowIndex) => (
        <tr key={`table_row_${rowIndex}`}>
          {Array.from({ length: columns }, (_col, colIndex) => (
            <td key={`table_cell_${colIndex}`}>
              <div className="w-full animate-pulse">
                {multilineColumnIndexes.includes(colIndex) || profileColumnIndexes.includes(colIndex) ? (
                  <>
                    {multilineColumnIndexes.includes(colIndex) && (
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="mb-2 h-2.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="h-2 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                      </div>
                    )}
                    {profileColumnIndexes.includes(colIndex) && (
                      <div className="flex items-center space-x-3">
                        <svg
                          className="h-10 w-10 text-gray-200 dark:text-gray-700"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
                        </svg>
                        <div>
                          <div className="mb-2 h-2.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="h-2 w-40 rounded-full bg-gray-200 dark:bg-gray-700" />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default SkeletonTableRow;
