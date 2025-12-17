// Mock for cosmos-client
export const cosmosClient = {
  getContainer: jest.fn().mockReturnValue({
    items: {
      create: jest.fn().mockResolvedValue({ resource: {} }),
      query: jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      }),
    },
    item: jest.fn().mockReturnValue({
      read: jest.fn().mockResolvedValue({ resource: {} }),
      replace: jest.fn().mockResolvedValue({ resource: {} }),
      delete: jest.fn().mockResolvedValue({ resource: {} }),
    }),
  }),
};
