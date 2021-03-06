import Request from './Request'

/**
 * Allows the user to stack the filter functions before they call any of
 *
 * select() - "get"
 *
 * insert() - "post"
 *
 * update() - "patch"
 *
 * delete() - "delete"
 *
 * Once any of these are called the filters are passed down to the Request
 *
 * @class
 * @param {string} url The full URL
 */

class Builder {
  constructor(url, headers = {}, schema) {
    this.url = url
    this.queryFilters = []
    this.headers = headers
    this.schema = schema
  }

  request(method) {
    if (this.schema) {
      if (method == 'GET') this.headers['Accept-Profile'] = this.schema
      else this.headers['Content-Profile'] = this.schema
    }
    return new Request(method, this.url, this.headers)
  }

  addFilters(request, options) {
    if (Object.keys(options).length != 0) {
      Object.keys(options).forEach((option) => {
        let setting = options[option]
        request.set(option, setting)
      })
    }

    // loop through this.queryFilters
    this.queryFilters.forEach((queryFilter) => {
      switch (queryFilter.filter) {
        case 'filter':
          request.filter(queryFilter.columnName, queryFilter.operator, queryFilter.criteria)
          break

        case 'not':
          request.not(queryFilter.columnName, queryFilter.operator, queryFilter.criteria)
          break

        case 'match':
          request.match(queryFilter.query)
          break

        case 'order':
          request.order(queryFilter.columnName, queryFilter.ascending, queryFilter.nullsFirst)
          break

        case 'limit':
          request.limit(queryFilter.columnName, queryFilter.criteria)
          break

        case 'offset':
          request.offset(queryFilter.columnName, queryFilter.criteria)
          break

        case 'range':
          request.range(queryFilter.from, queryFilter.to)
          break

        case 'single':
          request.single()
          break

        default:
          break
      }
    })
  }

  filter(columnName, operator, criteria) {
    this.queryFilters.push({
      filter: 'filter',
      columnName,
      operator,
      criteria,
    })

    return this
  }

  not(columnName, operator, criteria) {
    this.queryFilters.push({
      filter: 'not',
      columnName,
      operator,
      criteria,
    })

    return this
  }

  match(query) {
    this.queryFilters.push({
      filter: 'match',
      query,
    })

    return this
  }

  order(columnName, ascending = false, nullsFirst = false) {
    this.queryFilters.push({
      filter: 'order',
      columnName,
      ascending,
      nullsFirst,
    })

    return this
  }

  limit(columnName, criteria) {
    this.queryFilters.push({
      filter: 'limit',
      columnName,
      criteria
    })
  }

  offset(columnName, criteria) {
    this.queryFilters.push({
      filter: 'offset',
      columnName,
      criteria
    })
  }

  range(from, to) {
    this.queryFilters.push({
      filter: 'range',
      from,
      to,
    })

    return this
  }

  single() {
    this.queryFilters.push({ filter: 'single' })

    return this
  }

  /**
   * Start a "GET" request
   */
  select(columnQuery = '*', options = {}) {
    let method = 'GET'
    let request = this.request(method)

    request.select(columnQuery)
    this.addFilters(request, options)

    return request
  }

  /**
   * Start a "POST" request
   */
  insert(data, options = { upsert: false }) {
    let method = 'POST'
    let request = this.request(method)
    let header = options.upsert
      ? 'return=representation,resolution=merge-duplicates'
      : 'return=representation'

    request.set('Prefer', header)
    request.send(data)

    this.addFilters(request, options)

    return request
  }

  /**
   * Start a "PATCH" request
   */
  update(data, options = {}) {
    let method = 'PATCH'
    let request = this.request(method)

    if (Array.isArray(data)) {
      return {
        body: null,
        status: 400,
        statusCode: 400,
        statusText: 'Data type should be an object.',
      }
    }

    request.set('Prefer', 'return=representation')
    request.send(data)

    this.addFilters(request, options)

    return request
  }

  /**
   * Start a "DELETE" request
   */
  delete(options = {}) {
    let method = 'DELETE'
    let request = this.request(method)

    this.addFilters(request, options)

    return request
  }
}

// pre-empts if any of the filters are used before select
const advancedFilters = [
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'cs',
  'cd',
  'ova',
  'ovr',
  'sl',
  'sr',
  'nxr',
  'nxl',
  'adj',
]

advancedFilters.forEach(
  (operator) =>
    (Builder.prototype[operator] = function filterValue(columnName, criteria) {
      this.filter(columnName, operator, criteria)
      return this
    })
)

export default Builder
