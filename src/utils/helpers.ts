// Query convention ?page=1&pageSize=10&sort=[["id","ASC"],["firstname","DESC"]]&...
export const transformQueries = (query: any) => {
  const { page, pageSize, sort, ...others } = query;
  const result = {};

  if (pageSize) { result["pagination"] = { limit: +pageSize, offset: ((page??1) - 1) * pageSize } }
  if (sort) { result["sort"] = JSON.parse(sort) }
  
  return { ...result, ...others }
}

export const generateNumber = (length: number) => {
  return Math.floor(Math.random() * 9 * Math.pow(10, length - 1)) + Math.pow(10, length - 1);
}