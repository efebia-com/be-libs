import mongoose from 'mongoose';

const isNonEmptyString = (value: string) => typeof value === 'string' && value.length > 0;

/**
 * Adds pagination filters: filters elements after the selected element by id
 * or by field
 * @param lastElementFieldValue value of the field of last element
 * @param lastElementId _id of last element
 * @param param2 sorting fields
 * @param filterQuery the filter on wich add the pagination filters
 */
export const createPaginationQuery = (lastElementFieldValue: any, lastElementId: string | mongoose.Types.ObjectId, { field: lastElementFieldKey, direction = 'asc' }: { field: any; direction: 'asc' | 'desc' }, filterQuery: mongoose.FilterQuery<any>) => {
    if (!(lastElementFieldValue)) return;

    const directionOperator = direction == 'asc' ? '$gt' : '$lt';
    const hasFollowingFieldValue = { [directionOperator]: lastElementFieldValue };
    // Shallow copy of the original query
    const newQuery = { ...filterQuery };
    
    if (lastElementId) {
        if (!isNonEmptyString(lastElementFieldKey)) throw new Error('lastElementFieldKey has to be a non empty string');

        const lastElementObjectId = lastElementId instanceof mongoose.Types.ObjectId ? lastElementId : new mongoose.Types.ObjectId(lastElementId);

        const mustFollowLastElementByField = { [lastElementFieldKey]: hasFollowingFieldValue };
        const mustFollowLastElementById = { _id: { [directionOperator]: lastElementObjectId } };
        const mustMatchField = { [lastElementFieldKey]: lastElementFieldValue };

        const mustMatchFieldAndMustFollowElementById = {
            ...mustMatchField,
            ...mustFollowLastElementById
        };

        const mustFollowElement = [mustFollowLastElementByField, mustMatchFieldAndMustFollowElementById];
        const andMustFollowElement = (previousCondition: mongoose.Condition<any>) => ({ ...previousCondition, $or: mustFollowElement });

        newQuery.$or = newQuery.$or ?
            newQuery.$or.map(andMustFollowElement) :
            mustFollowElement;
    } else {
        newQuery[lastElementFieldKey] = hasFollowingFieldValue;
    }
    return newQuery;
};

/**
 * Adds pagination filters: filters elements after the selected element by id
 * or by field and also return the sort values
 * @param lastElementFieldValue value of the field of last element
 * @param lastElementId _id of last element
 * @param param2 sorting fields
 * @param filterQuery the filter on wich add the pagination filters
 */
export const createPaginationAndSortingQuery = (lastElementFieldValue: any, lastElementId: string | mongoose.Types.ObjectId, { field: lastElementFieldKey, direction = 'asc' }: { field: any; direction: 'asc' | 'desc' }, filterQuery: mongoose.FilterQuery<any>) => {
    const pageQuery = createPaginationQuery(lastElementFieldValue, lastElementId, { field: lastElementFieldKey, direction }, filterQuery);
    const parsedDirection = direction === 'asc' ? 1 : -1;
    return {
        page: pageQuery,
        sort: {
            [lastElementFieldKey]: parsedDirection,
            _id: parsedDirection
        }
    }
}
