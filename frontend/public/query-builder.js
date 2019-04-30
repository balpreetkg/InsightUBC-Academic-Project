/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    let query = {};
    let active = document.getElementsByClassName("tab-panel active")[0];
    let type = active.getAttribute("data-type");
    let validKeys = ["audit", "id", "uuid", "avg", "instructor", "year",
        "dept", "pass", "fail", "title", "address", "lat", "seats", "fullname", "lon",
        "shortname", "furniture", "name", "type", "href", "number"];
    let numKeys = ["pass", "fail", "audit", "avg", "year", "lat", "lon", "seats"];
    let filters = [];
    let conditions = active.getElementsByClassName("conditions-container")[0].children;
    let columnsContainer = active.getElementsByClassName("form-group columns")[0];
    let cgroup = columnsContainer.getElementsByClassName("control-group")[0];
    let columns = cgroup.getElementsByClassName("control field");
    let transformColumns = cgroup.getElementsByClassName("control transformation");
    let optionsObj = {};
    let col = [];
    let dir = "UP";
    let keys = [];
    let order = active.getElementsByClassName("control order fields")[0].children[0].children;
    let orderObj = {};
    let groupContainer = active.getElementsByClassName("form-group groups")[0].children[1].children;
    let groups = [];
    let transformObj = {};
    let applyContainer = active.getElementsByClassName("form-group transformations")[0].children[1].children;
    let applyRules = [];

    // set the WHERE block
    if (conditions.length !== 0) {
        for (let i = 0; i < conditions.length; i++) {
            let elements = conditions[i].children;
            let obj = {};
            let value = elements[3].children[0].getAttribute("value");
            if (numKeys.includes(elements[1].children[0].selectedOptions[0].getAttribute("value"))) {
                value = Number.parseFloat(value);
            }
            obj[type + "_" + elements[1].children[0].selectedOptions[0].getAttribute("value")] =
                value;
            let filter = {};
            filter[elements[2].children[0].selectedOptions[0].getAttribute("value")] = obj;
            if (elements[0].children[0].getAttribute("checked") !== null) {
                let notObj = {};
                notObj.NOT = filter;
                filters.push(notObj);
            } else {
                filters.push(filter);
            }
        }
        let whereBlock = {};
        let cond1 = document.getElementById(type + "-conditiontype-all");
        let cond2 = document.getElementById(type + "-conditiontype-any");
        let cond3 = document.getElementById(type + "-conditiontype-none");
        if (filters.length > 1) {
            if (cond1.checked) {
                whereBlock.AND = filters;
            } else if (cond2.checked) {
                whereBlock.OR = filters;
            } else if (cond3.checked) {
                whereBlock.NOT = {OR: filters};
            }
            query.WHERE = whereBlock;
        } else {
            query.WHERE = filters[0];
        }
    } else {
        query.WHERE = {};
    }

    // set the COLUMNS
    for (let i = 0; i < columns.length; i++) {
        if (columns[i].children[0].checked) {
            col.push(type + "_" + columns[i].children[0].getAttribute("value"));
        }
    }
    for (let i = 0; i < transformColumns.length; i++) {
        if (transformColumns[i].children[0].checked) {
            col.push(transformColumns[i].children[0].getAttribute("value"));
        }
    }
    optionsObj.COLUMNS = col;

    // set the ORDER
    if (document.getElementById(type + "-order").checked) {
        dir = "DOWN";
    }
    for (let i = 0; i < order.length; i++) {
        let orderKey = order[i];
        if (orderKey.getAttribute("selected") !== null) {
            if (validKeys.includes(orderKey.getAttribute("value"))) {
                keys.push(type + "_" + orderKey.getAttribute("value"));
            } else {
                keys.push(orderKey.getAttribute("value"));
            }
        }
    }

    // if ORDER exists, add it to the OPTIONS block
    if (keys.length === 1 && dir === "UP") {
        optionsObj.ORDER = keys[0];
    } else if (keys.length > 1) {
        orderObj.dir = dir;
        orderObj.keys = keys;
        optionsObj.ORDER = orderObj;
    }

    // set the OPTIONS block
    query.OPTIONS = optionsObj;

    // set the GROUPS
    for (let i = 0; i < groupContainer.length; i++) {
        if (groupContainer[i].children[0].checked) {
            groups.push(type + "_" + groupContainer[i].children[0].getAttribute("value"));
        }
    }
    transformObj.GROUP = groups;

    // set APPLY
    for (let i = 0; i < applyContainer.length; i++) {
        let applyRule = applyContainer[i];
        let elements = applyRule.children;
        let applyKey = elements[0].children[0].getAttribute("value");
        let applyToken = elements[1].children[0].selectedOptions[0].getAttribute("value");
        let key = elements[2].children[0].selectedOptions[0].getAttribute("value");
        let obj1 = {};
        let obj2 = {};
        obj1[applyToken] = (type + "_" + key);
        obj2[applyKey] = obj1;
        applyRules.push(obj2);
    }
    transformObj.APPLY = applyRules;

    // if GROUPS exist, add TRANSFORMATIONS to QUERY
    if (groups.length > 0) {
        query.TRANSFORMATIONS = transformObj;
    }

    return query;
};
