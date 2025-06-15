import '@testing-library/jest-dom';
// import { Database } from 'server/config/database';
// import { DataSource } from 'typeorm';

// let dataSource: DataSource;

// beforeAll(async () => {
//   // Initialize the data source only once
//   dataSource = await Database.getInstance().getDataSource();
  
//   // Make sure the data source is initialized
//   if (!dataSource.isInitialized) {
//     await dataSource.initialize();
//   }
// });

// afterAll(async () => {
//   // Only destroy if initialized
//   if (dataSource && dataSource.isInitialized) {
//     await dataSource.destroy();
//   }
// });