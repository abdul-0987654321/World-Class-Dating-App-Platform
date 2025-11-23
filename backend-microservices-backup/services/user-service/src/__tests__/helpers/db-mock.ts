export const createMockQueryBuilder = () => {
  const mockQueryBuilder: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereNotNull: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    first: jest.fn(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    count: jest.fn(),
    then: jest.fn(),
  };

  return mockQueryBuilder;
};

export const createMockKnex = () => {
  const mockQueryBuilder = createMockQueryBuilder();

  const mockKnex: any = jest.fn((_tableName: string) => mockQueryBuilder);

  mockKnex.raw = jest.fn();
  mockKnex.fn = {
    now: jest.fn(() => new Date()),
  };
  mockKnex.schema = {
    hasTable: jest.fn(),
    createTable: jest.fn(),
    dropTable: jest.fn(),
    table: jest.fn(),
  };
  mockKnex.transaction = jest.fn((callback) => callback(mockKnex));
  mockKnex.destroy = jest.fn();

  return { mockKnex, mockQueryBuilder };
};

export const mockDatabase = (_tableName: string, mockData: any = []) => {
  const { mockKnex, mockQueryBuilder } = createMockKnex();

  // Setup default mock behavior
  mockQueryBuilder.then.mockImplementation((resolve: any) => {
    resolve(mockData);
    return Promise.resolve(mockData);
  });

  mockQueryBuilder.first.mockResolvedValue(Array.isArray(mockData) ? mockData[0] : mockData);

  return { mockKnex, mockQueryBuilder };
};
