import SearchQuery from 'core/store/lib/search/searchQuery'
import config from '../lib/config'

/**
 * Create slugify -> "create-slugify" permalink  of text
 * @param {String} text
 */
export function slugify (text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
}

/**
 * Re-format category path to be suitable for breadcrumb
 * @param {Array} categoryPath
 */
export function breadCrumbRoutes (categoryPath) {
  const tmpRts = []
  for (let sc of categoryPath) {
    tmpRts.push({
      name: sc.name,
      route_link: (config.products.useShortCatalogUrls ? '/' : '/c/') + sc.slug
    })
  }

  return tmpRts
}

/**
 * Return configurable product thumbnail depending on the configurable_children
 * @param {object} product
 * @param {bool} ignoreConfig
 */
export function productThumbnailPath (product, ignoreConfig = false) {
  let thumbnail = product.image
  if ((product.type_id && product.type_id === 'configurable') && product.hasOwnProperty('configurable_children') &&
    product.configurable_children.length && (ignoreConfig || !product.is_configured) &&
    ('image' in product.configurable_children[0])
  ) {
    thumbnail = product.configurable_children[0].image
    if (!thumbnail || thumbnail === 'no_selection') {
      const childWithImg = product.configurable_children.find(f => f.image && f.image !== 'no_selection')
      if (childWithImg) {
        thumbnail = childWithImg.image
      } else {
        thumbnail = product.image
      }
    }
  }
  return thumbnail
}

export function buildFilterProductsQuery (currentCategory, chosenFilters, defaultFilters = null) {
  let filterQr = baseFilterProductsQuery(currentCategory, defaultFilters == null ? config.products.defaultFilters : defaultFilters)

  // add choosedn filters
  for (let code of Object.keys(chosenFilters)) {
    const filter = chosenFilters[code]

    if (filter.attribute_code !== 'price') {
      filterQr = filterQr.applyFilter({key: filter.attribute_code, value: {'eq': filter.id}, scope: 'catalog'})
    } else { // multi should be possible filter here?
      const rangeqr = {}
      if (filter.from) {
        rangeqr['gte'] = filter.from
      }
      if (filter.to) {
        rangeqr['lte'] = filter.to
      }
      filterQr = filterQr.applyFilter({key: filter.attribute_code, value: rangeqr, scope: 'catalog'})
    }
  }

  return filterQr
}

export function baseFilterProductsQuery (parentCategory, filters = []) { // TODO add aggregation of color_options and size_options fields
  let searchProductQuery = new SearchQuery()
  searchProductQuery = searchProductQuery
    .applyFilter({key: 'visibility', value: {'in': [2, 3, 4]}})
    .applyFilter({key: 'status', value: {'in': [0, 1, 2]}}) // @TODO Check if status 2 (disabled) was set not by occasion here

  if (config.products.listOutOfStockProducts === false) {
    searchProductQuery = searchProductQuery.applyFilter({key: 'stock.is_in_stock', value: {'eq': true}})
  }
  // Add available catalog filters
  for (let attrToFilter of filters) {
    searchProductQuery = searchProductQuery.addAvailableFilter({field: attrToFilter, scope: 'catalog'})
  }

  let childCats = [parentCategory.id]
  if (parentCategory.children_data) {
    let recurCatFinderBuilder = (category) => {
      if (!category) {
        return
      }

      if (!category.children_data) {
        return
      }

      for (let sc of category.children_data) {
        if (sc && sc.id) {
          childCats.push(sc.id)
        }
        recurCatFinderBuilder(sc)
      }
    }
    recurCatFinderBuilder(parentCategory)
  }
  searchProductQuery = searchProductQuery.applyFilter({key: 'category_ids', value: {'in': childCats}})
  return searchProductQuery
}

export function prepareNewProductsQuery () {
  let newProductsQuery = new SearchQuery()
  newProductsQuery = newProductsQuery
    .applyFilter({key: 'category.name', value: {'eq': 'tees'}}) // Tees category
    // .applyFilter({key: 'category.category_id', value: {'in': [16, 25, 33]}}) // IDs of Tees category
    .applyFilter({key: 'visibility', value: {'in': [2, 3, 4]}})

  return newProductsQuery
}

export function prepareCoolBagsQuery () {
  let coolBagsQuery = new SearchQuery()
  coolBagsQuery = coolBagsQuery
    .applyFilter({key: 'category.name', value: {'eq': 'women'}}) // Tees category
    // .applyFilter({key: 'category.category_id', value: {'in': [20, 30]}}) // IDs of Women category
    .applyFilter({key: 'visibility', value: {'in': [2, 3, 4]}})

  return coolBagsQuery
}

export function prepareQuickSearchQuery (queryText) {
  let searchQuery = new SearchQuery()

  searchQuery = searchQuery
    .setSearchText(queryText)
    .applyFilter({key: 'visibility', value: {'in': [3, 4]}})
    .applyFilter({key: 'status', value: {'in': [0, 1]}})/* 2 = disabled, 3 = out of stock */

  if (config.products.listOutOfStockProducts === false) {
    searchQuery = searchQuery.applyFilter({key: 'stock.is_in_stock', value: {'eq': true}})
  }

  return searchQuery
}

export function preparePageNotFoundQuery () {
  let ourBestsellersQuery = new SearchQuery()
  ourBestsellersQuery = ourBestsellersQuery
    .applyFilter({key: 'visibility', value: {'in': [2, 3, 4]}})

  return ourBestsellersQuery
}
