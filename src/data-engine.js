class DataEngine {
  /**
   * @constructor
   * @param {object[]} data
   * @param {object} [propertyMap={}]
   */
  constructor({ data, propertyMap = {} }) {
    this.data = data
    this.sortedData = []
    this.sortedDataDomArray = []
    this.propertyMap = propertyMap

    this.maybeTransformData()
  }

  maybeTransformData() {
    if (!Object.keys(this.propertyMap).length) return;

    const getItemPropProxyName = this.getItemPropProxyName.bind(this)

    this.data = this.data.map(item => {
      return new Proxy(item, {
        get(target, prop, receiver) {
          return Reflect.get(target, getItemPropProxyName(prop), receiver)
        }
      })
    })
  }

  /**
   * @param {PropertyKey} prop
   * @returns {PropertyKey}
   */
  getItemPropProxyName(prop) {
    if (this.propertyMap.hasOwnProperty(prop)) {
      return this.propertyMap[prop]
    }
    return prop
  }

  /**
   * @returns {object[]}
   */
  sortListItems() {
    this.sortedData = [...this.data].sort((item1, item2) => {
      if (!item1.parent && item2.parent) return -1
      return (!item2.parent && item1.parent) ? 1 : 0;
    });

    return this.sortedData
  }

  /**
   * @param {object[]} item
   * @param {string} nodeName
   * @returns {HTMLElement}
   */
  createItemElement(item, nodeName = 'li') {
    const { id, text } = item
    const el = document.createElement(nodeName)
    el.dataset.id = id
    if (nodeName === 'li') el.innerHTML = text

    return el
  }

  /**
   * @param {HTMLElement} node
   * @param {object} item
   * @returns {boolean}
   */
  elementIsParentOfItem(node, item) {
    return node.dataset.id === `${item.parent}`
  }

  /**
   * @param {HTMLElement} node
   * @param {object} item
   * @param {string} nodeName
   * @returns {HTMLElement|null}
   */
  getParentNodeOfItem(node, item, nodeName) {
    return node.querySelector(`${nodeName}[data-id="${item.parent}"]`)
  }

  /**
   * @param {HTMLElement} node
   * @param {object} item
   * @returns {boolean}
   */
  elementIsAncestorOfItem(node, item) {
    return !!this.getParentNodeOfItem(node, item, 'li')
  }

  /**
   * @param {HTMLElement} node
   * @param {object} item
   * @returns {HTMLElement}
   */
  getDirectListParentOfItem(node, item) {
    return this.getParentNodeOfItem(node, item, 'ul')
  }

  /**
   * @param {object} item
   * @returns {boolean}
   */
  maybeAppendItemToParentDom(item) {
    const { parent } = item
    const topParent = this.sortedDataDomArray.find(topLevelListItem => {
      return this.elementIsParentOfItem(topLevelListItem, item) || this.elementIsAncestorOfItem(topLevelListItem, item)
    })

    if (!topParent) return false;

    const listItem = this.createItemElement(item)
    let directParentList = this.getDirectListParentOfItem(topParent, item)

    if (!directParentList) {
      // so we need to create the direct parent UL and append it to the direct parent LI
      directParentList = this.createItemElement({ id: parent }, 'ul')
      const directParentListItem = this.getParentNodeOfItem(topParent, item, 'li') || topParent
      directParentListItem.appendChild(directParentList)
    }

    directParentList.appendChild(listItem)

    return true
  }

  /**
   * @returns {array}
   */
  getListItemsDom() {
    this.sortedDataDomArray = []
    let processedItems = []

    while (processedItems.length !== this.sortListItems().length) {
      processedItems = this.sortedData.reduce((processedItems, item) => {
        const { id } = item
        if (processedItems.includes(id)) return processedItems

        let itemAdded
        if (!item.parent) {
          const listItem = this.createItemElement(item)
          this.sortedDataDomArray.push(listItem)
          itemAdded = true
        } else {
          itemAdded = this.maybeAppendItemToParentDom(item)
        }

        if (itemAdded) processedItems.push(id)

        return processedItems
      }, processedItems)
    }

    return this.sortedDataDomArray
  }

  /**
   * @param {HTMLUListElement} ul
   * @returns {object[]}
   */
  convertDomToData(ul) {
    return Array.from(ul.querySelectorAll('li')).map(li => {
      const parentListItem = li.parentNode
      const parent = parentListItem.dataset.id

      return {
        [this.getItemPropProxyName('id')]: li.dataset.id,
        [this.getItemPropProxyName('parent')]: parent,
      }
    })
  }

  /**
   * @returns {HTMLUListElement}
   */
  render() {
    const list = document.createElement('ul')
    this.getListItemsDom().forEach(listItem => list.appendChild(listItem))
    return list
  }
}

export default DataEngine