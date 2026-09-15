/**
 * Subscription Helper module
 */

/**
 * Checks if a specific item is valid according to the customValidityMap in the subscription details.
 * @param {Object} detailsOrSubscription - the subscriptionDetails object from SubscriptionOrder or the Subscription itself.
 * @param {Date} startDate - The startDate of the UserSubscription.
 * @param {string} itemId - The ID of the item being checked (e.g. courseId, testSeriesId).
 * @returns {boolean} - true if it is valid or no custom validity exists, false if it has expired.
 */
function isItemValidCustomValidity(detailsOrSubscription, startDate, itemId) {
    if (!detailsOrSubscription || !detailsOrSubscription.customValidityMap) {
        return true;
    }

    if (!itemId) {
        return true;
    }

    // Access map like object or Mongoose Map
    let validityMonths;
    if (typeof detailsOrSubscription.customValidityMap.get === 'function') {
        validityMonths = detailsOrSubscription.customValidityMap.get(itemId.toString());
    } else {
        validityMonths = detailsOrSubscription.customValidityMap[itemId.toString()];
    }

    if (!validityMonths) {
        return true; // No custom validity specified for this item, falls back to normal subscription validity
    }

    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + Number(validityMonths));

    return new Date() <= expiryDate;
}

module.exports = {
    isItemValidCustomValidity
};
