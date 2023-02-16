import { Op } from "sequelize"

// Query convention ?filter={"q":"ad"}&page=1&pageSize=10&sort=[["id","ASC"],["firstname","DESC"]]&...
export const transformQueries = (query: any, searchOnFields?: string[]) => {
  const { filter, page, pageSize, sort, ...others } = query;
  const result = {};

  if (filter) {
    const obj = JSON.parse(filter);
    let q = {}
    const filters = {};
    Object.entries(obj).forEach(entry => {
      const [key, value] = entry;
      if (key === "q" && searchOnFields) {
        const search = {
          [Op.iLike]: "%" + value + "%"
        }
        const allFields = {};
        searchOnFields.forEach((item: string) => (allFields[item] = search));
        return q = { [Op.or]: allFields };
      }
      filters[key] = value;
    });
    result["filters"] = { ...filters, ...q };
  }
  if (pageSize) { result["pagination"] = { limit: +pageSize, offset: ((page??1) - 1) * pageSize } }
  if (sort) { result["sort"] = JSON.parse(sort) }
  
  return { ...result, ...others }
}