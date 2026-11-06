export const memberships = item => [...new Set([item.collection, ...(Array.isArray(item.collections) ? item.collections : [])].filter(Boolean))];
export const inCollection = (item, name) => memberships(item).includes(name);
export const withMemberships = (item, names) => ({ ...item, collection:names[0] || "", collections:[...new Set(names)] });
