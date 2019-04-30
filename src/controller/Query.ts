import {IQ, IQuery} from "./IQuery";
import {InsightError} from "./IInsightFacade";
import {isObject, isString, log} from "util";
import {Decimal} from "decimal.js";

export default class Query implements IQuery {
    private id: string;
    private columns: string[] = [];
    private groupKeys: string[] = [];
    private kind: string;
    private groupPresent: boolean = false;
    private groups: any = [];
    private groupsResult: any = [];
    private applyKeys: string[] = [];
    private validKeys: string[];
    private validStringKeys: string[];
    private validNumberKeys: string[];
    private coursesKeys: string[] = ["dept", "id", "instructor", "title", "uuid", "pass", "fail",
        "audit", "avg", "year"];
    private roomsKeys: string[] = ["fullname", "shortname", "number", "name", "address", "lat",
        "lon", "seats", "type", "furniture", "href"];
    private typeOfKeys: any = {
        dept: "string", id: "string", instructor: "string", title: "string", pass: "number", fail: "number",
        audit: "number", uuid: "string", avg: "number", year: "number", fullname: "string",
        shortname: "string", number: "string", name: "string", address: "string", lat: "number",
        lon: "number", seats: "number", type: "string", furniture: "string", href: "string"};
    public arrayCreator(query: IQ): object[] {
        let result: object[] = [];
        if (this.idExtractor(query) === true) {
            let fs = require("fs");
            const path = "./data/" + this.kind + "/";
            let files = fs.readdirSync(path);
            for (let filename of files) {
                if (filename.includes(this.id)) {
                    if (filename.endsWith("json")) {
                        let file = fs.readFileSync(path + filename, "utf8");
                        result = JSON.parse(file);
                    }
                }
            }
        }
        if (result.length > 0) {
            this.setValidKeys();
            return result;
        } else {
            throw new InsightError("Error in extracting ID or in finding files matching it");
        }
    }
    public idExtractor(query: IQ): boolean {
        const keys: string[] = Object.keys(query);
        if (keys.length === 2) {
            if (!(keys.includes("WHERE") && keys.includes("OPTIONS"))) {
                throw new InsightError("Query has 2 keys that are not WHERE and OPTIONS");
            }
            if (!(Object.keys(query.OPTIONS).includes("COLUMNS"))) {
                throw new InsightError("Query doesn't contain COLUMNS key");
            }
            let columns: string[] = query.OPTIONS.COLUMNS;
            if (columns.length === 0) {
                throw new InsightError("the columns have no key within them");
            }
            if (columns[0].includes("_")) {
                let array = columns[0].split("_", 2);
                this.id = array[0];
                if (this.coursesKeys.includes(array[1])) {
                    this.kind = "courses";
                } else if (this.roomsKeys.includes(array[1])) {
                    this.kind = "rooms";
                } else {
                    throw new InsightError("Key is neither rooms or courses in idExtractor");
                }
                return true;
            } else {
                throw new InsightError("Columns doesn't contain a valid key");
            }
        } else if (keys.length === 3) {
            if (!(keys.includes("WHERE") && keys.includes("OPTIONS")
                && keys.includes("TRANSFORMATIONS"))) {
                throw new InsightError("Query has 3 keys that are not the correct ones");
            }
            if (!(Object.keys(query.TRANSFORMATIONS).includes("GROUP"))) {
                throw new InsightError("Query in idExtractor" +
                    "doesn't contain GROUP when it does contain TRANS");
            }
            let groupKeys: string[] = query.TRANSFORMATIONS.GROUP;
            if (groupKeys.length === 0) {
                throw new InsightError("The Group has no keys within it");
            }
            if (groupKeys[0].includes("_")) {
                let array = groupKeys[0].split("_", 2);
                this.id = array[0];
                if (this.coursesKeys.includes(array[1])) {
                    this.kind = "courses";
                } else if (this.roomsKeys.includes(array[1])) {
                    this.kind = "rooms";
                } else {
                    throw new InsightError("Key is neither rooms or courses in idExtractor");
                }
                return true;
            } else {
                throw new InsightError("Columns doesn't contain a valid key");
            }
        } else {
            throw new InsightError("Query does not have accurate amount of keys in idExtractor");
        }
    }
    public setValidKeys() {
        if (this.kind === "rooms") {
            this.validKeys = this.roomsKeys;
            this.validStringKeys = ["fullname", "shortname", "number", "name", "address",
                "type", "furniture", "href"];
            this.validNumberKeys = ["lat", "lon", "seats"];
        } else if (this.kind === "courses") {
            this.validKeys = this.coursesKeys;
            this.validStringKeys = ["dept", "id", "instructor", "title", "uuid"];
            this.validNumberKeys = ["pass", "fail", "audit", "avg", "year"];
        } else {
            throw new InsightError("Kind is not correct in valid Keys");
        }
    }
    public computeQuery(query: IQ, result: object[]): object[] {
        let copyResult: any = result;
        const keys: string[] = Object.keys(query);
        if (!(keys.includes("WHERE") && keys.includes("OPTIONS"))) {
            throw new InsightError("Query does not have WHERE key/OPTIONS key in computeQuery");
        }
        if ((Object.keys(query.WHERE).length) > 0) {
            copyResult = this.computeWHERE(query.WHERE, copyResult);
        }
        if (keys.length === 2) {
            copyResult = this.computeOPTIONS(query.OPTIONS, copyResult);
        } else if (keys.length === 3 && keys.includes("TRANSFORMATIONS")) {
            let transKeys = Object.keys(query.TRANSFORMATIONS);
            if (!(transKeys.length === 2 &&
                transKeys.includes("GROUP") && transKeys.includes("APPLY"))) {
                throw new InsightError("Transformations doesn't only include GROUP and APPLY or" +
                    "isn't the right length");
            }
            if (!(Array.isArray(query.TRANSFORMATIONS.GROUP))) {
                throw new InsightError("element of GROUP is not an array in computeTrans");
            }
            for (let k of query.TRANSFORMATIONS.GROUP) {
                if (!(isString(k))) {
                    throw new InsightError("Element of Group is not string");
                }
            }
            copyResult = this.computeTRANSFORMATIONS(query.TRANSFORMATIONS.APPLY, query.TRANSFORMATIONS.GROUP,
                copyResult);
            copyResult = this.computeOPTIONS(query.OPTIONS, copyResult);
        } else {
            throw new InsightError("Query does not have the correct amount of keys in computeQuery");
        }
        for (let section of copyResult) {
            let sKeys = Object.keys(section);
            for (let key of sKeys) {
                if (this.validKeys.includes(key)) {
                    Object.defineProperty(section, (this.id + "_" + key),
                        Object.getOwnPropertyDescriptor(section, key));
                    delete section[key];
                }
            }
        }
        if (copyResult.length < 5000) {
            return copyResult;
        } else {
            throw new InsightError("The result was 5000 or more sections");
        }
    }
    public computeTRANSFORMATIONS(applyBlock: any, group: string[], result: any): object[] {
        for (let k of group) {
            if (!(k.includes("_"))) {
                throw new InsightError("One of the group keys don't include _");
            }
            let array: string[] = k.split("_", 2);
            if (array[0] === this.id && this.validKeys.includes(array[1])) {
                this.groupKeys.push(array[1]);
            } else {
                throw new InsightError("The key within the group is not a valid key, " +
                    "or the ID doesn't match");
            }
        }
        this.groupPresent = true;
        for (let element of result) {
            let unique: any = {};
            let newElement: boolean = true;
            for (let e of this.groupKeys) {
                if (!(Object.keys(element).includes(e))) {
                    throw new InsightError("Specific element doesn't contain one of the group keys");
                }
                unique[e] = element[e];
            }
            for (let groupMember of this.groups) {
                let theSame: boolean = true;
                for (let key of Object.keys(unique)) {
                    if (!(groupMember[0][key] === unique[key])) {
                        theSame = false;
                    }
                }
                if (theSame) {
                    groupMember.push(element);
                    newElement = false;
                    break;
                }
            }
            if (newElement) {
                let dummyArray: any = [];
                dummyArray.push(element);
                this.groups.push(dummyArray);
                this.groupsResult.push(unique);
            }
        }
        if (applyBlock.length > 0) {
            return this.computeAPPLY(applyBlock);
        } else {
            return this.groupsResult;
        }
    }
    public computeAPPLY(applyBlock: any): object[] {
        for (let applyElement of applyBlock) {
            let keys = Object.keys(applyElement);
            let elementKeys: any;
            if (keys.length !== 1) {
                throw new InsightError("The apply element doesn't contain 1 key");
            }
            if (keys[0].includes("_")) {
                throw new InsightError("The Apply Key includes an _");
            }
            if (!(this.applyKeys.includes(keys[0]))) {
                this.applyKeys.push(keys[0]);
            } else {
                throw new InsightError("ApplyKeys contains duplicate keys");
            }
            if (isObject(applyElement[keys[0]])) {
                elementKeys = Object.keys(applyElement[keys[0]]);
                if (elementKeys.length !== 1) {
                    throw new InsightError("Element of apply element does not have only 1 key");
                }
            } else {
                throw new InsightError("Apply element is not a nested object");
            }
            for (let i in this.groupsResult) {
                if (this.groupsResult.hasOwnProperty(i)) {
                    this.groupsResult[i][keys[0]] = this.applyRule(applyElement[keys[0]], i);
                }
            }
        }
        return this.groupsResult;
    }
    public applyRule(applyObject: any, index: string): number {
        let applyKey = Object.keys(applyObject);
        let array: string[];
        if (applyKey.length !== 1) {
            throw new InsightError("The ApplyRule has more than 1 apply token");
        }
        if (isString(applyObject[applyKey[0]])) {
            let key: string = applyObject[applyKey[0]];
            array = key.split("_", 2);
            if (!(array[0] === this.id)) {
                throw new InsightError("The applyObject key does not match the id");
            }
            if (!(this.validKeys.includes(array[1]))) {
                throw new InsightError("The applyObject key is not included in Valid Keys");
            }
        } else {
            throw new InsightError("the applyObject is not a string");
        }
        switch (applyKey[0]) {
            case "MAX":
                if (this.validNumberKeys.includes(array[1])) {
                    let returnValue: number = null;
                    for (let element of this.groups[index]) {
                        if (element[array[1]] > returnValue || returnValue === null) {
                            returnValue = element[array[1]];
                        }
                    }
                    return returnValue;
                } else {
                    throw new InsightError("The key is not numerical for MAX");
                }
            case "MIN":
                if (this.validNumberKeys.includes(array[1])) {
                    let returnValue: number = null;
                    for (let element of this.groups[index]) {
                        if (element[array[1]] < returnValue || returnValue === null) {
                            returnValue = element[array[1]];
                        }
                    }
                    return returnValue;
                } else {
                    throw new InsightError("The key is not numerical for MIN");
                }
            case "AVG":
                if (this.validNumberKeys.includes(array[1])) {
                    let total: any = new Decimal(0);
                    for (let element of this.groups[index]) {
                        let avgNum = new Decimal(element[array[1]]);
                        total = total.add(avgNum);
                    }
                    let avg = total.toNumber() / this.groups[index].length;
                    return Number(avg.toFixed(2));
                } else {
                    throw new InsightError("The key is not numerical for AVG");
                }
            case "SUM":
                if (this.validNumberKeys.includes(array[1])) {
                    let sum: number = 0;
                    for (let element of this.groups[index]) {
                        sum = sum + element[array[1]];
                    }
                    return Number(sum.toFixed(2));
                } else {
                    throw new InsightError("The key is not numerical for SUM");
                }
            case "COUNT":
                let num: number = 0;
                let uniqueArray: any = [];
                for (let element of this.groups[index]) {
                    if (!(uniqueArray.includes(element[array[1]]))) { // todo ask ta
                        uniqueArray.push(element[array[1]]);
                        num = num + 1;
                    }
                }
                return num;
            default:
                throw new InsightError("The Apply Token is incorrect");
        }
    }
    public computeOPTIONS(optionsBlock: any, result: object[]): object[] {
        let copyResult = result;
        let keys = Object.keys(optionsBlock);
        if (keys.length === 1 && keys[0] === "COLUMNS") {
            copyResult = this.computeCOLUMNS(optionsBlock.COLUMNS, copyResult);
            return copyResult;
        } else if (keys.length === 2 && keys.includes("COLUMNS") && keys.includes("ORDER")) {
            copyResult = this.computeCOLUMNS(optionsBlock.COLUMNS, copyResult);
            if (!(isString(optionsBlock.ORDER) || isObject(optionsBlock.ORDER))) {
                throw new InsightError("content of options is incorrect");
            }
            copyResult = this.computeORDER(optionsBlock.ORDER, copyResult);
            return copyResult;
        } else {
            throw new InsightError("the Options block is not valid");
        }
    }
    public computeCOLUMNS(columns: string[], result: object[]): object[] {
        let copyResult: any = result;
        let allKeys: string[] = this.validKeys;
        this.columns = columns;
        if (this.groupPresent) {
            for (let key of this.columns) {
                let column: string[] = key.split("_", 2);
                if (!(this.groupKeys.includes(column[1]) || this.applyKeys.includes(key))) {
                    throw new InsightError("A group exists and there is a key within columns " +
                        "that is not within Group or Apply keys");
                }
            }
            allKeys = this.groupKeys.concat(this.applyKeys);
        }
        let keys: string[] = [];
        if (columns.length === 0) {
            throw new InsightError("Columns doesn't contain any keys");
        }
        for (let k of columns) {
            if (this.applyKeys.includes(k) && this.groupPresent) {
                keys.push(k);
                continue;
            }
            if (!(k.includes("_"))) {
                throw new InsightError("The columns key don't include _");
            }
            let array: string[] = k.split("_", 2);
            if (array[0] === this.id && this.validKeys.includes(array[1])) {
                keys.push(array[1]);
            } else {
                throw new InsightError("The key within the columns is not a valid key, " +
                    "or the ID doesn't match");
            }
        }
        let deleteKeys: string[] = allKeys
            .filter((x) => !keys.includes(x))
            .concat(keys.filter((x) => !allKeys.includes(x)));
        // the above produces a symmetric difference
        // thus all the items in allKeys that aren't in keys
        for (let section of copyResult) {
            for (let key of deleteKeys) {
                delete section[key];
            }
        }
        return copyResult;
    }
    public computeORDER(orderKeys: any, result: object[]): object[] {
        function sortByKey(array: any, keys: any, dir: number) {
            return array.sort(function (a: any, b: any) {
                for (let key of keys) {
                    let x = a[key];
                    let y = b[key];
                    if (x < y) {
                        return ((-1) * dir);
                    } else if (x > y) {
                        return dir;
                    }
                }
                return 0;
            });
        }
        if (isString(orderKeys)) {
            let orderKey: string = orderKeys;
            if (!(this.columns.includes(orderKey))) {
                throw new InsightError("The columns don't include the order key");
            }
            let arr: string[] = orderKey.split("_", 2);
            let dummyArray = [];
            dummyArray.push(arr[1]);
            return sortByKey(result, dummyArray, 1);
        } else if (isObject(orderKeys)) {
            let orderObjKeys = Object.keys(orderKeys);
            if (!(orderObjKeys.includes("dir") && orderObjKeys.includes("keys"))) {
                throw new InsightError("Order Object doesn't have correct keys");
            }
            let oKeys: string[] = [];
            for (let key of orderKeys.keys) {
                if (!(this.columns.includes(key))) {
                    throw new InsightError("The columns don't include one of the order keys");
                }
                if (!(this.applyKeys.includes(key))) {
                    let oArray = String(key).split("_", 2);
                    oKeys.push(oArray[1]);
                } else {
                    oKeys.push(key);
                }
            }
            let dirNum = 0;
            if (orderKeys.dir === "UP") {
                dirNum = 1;
            } else if (orderKeys.dir === "DOWN") {
                dirNum = (-1);
            } else {
                throw new InsightError("Direction isn't UP or DOWN in order");
            }
            return sortByKey(result, oKeys, dirNum);
        } else {
            throw new InsightError("order element is neither string or object");
        }
    }
    public computeWHERE(whereBlock: any, result: object[]): object[] {
        let keys = Object.keys(whereBlock);
        let copyResult: any = result;
        if (keys.length !== 1) {
            throw new InsightError("the where block has more than one filter");
        }
        for (let k of keys) {
            switch (k) {
                case "NOT":
                    copyResult = this.computeNOT(whereBlock[k], copyResult);
                    break;
                case "AND":
                    let andResult = this.computeAND(whereBlock[k], copyResult);
                    if (andResult === false) {
                        copyResult = [];
                    } else {
                        copyResult = andResult;
                    }
                    break;
                case "OR":
                    let orResult = this.computeOR(whereBlock[k], copyResult);
                    if (orResult === false) {
                        copyResult = [];
                    } else {
                        copyResult = orResult;
                    }
                    break;
                case "IS":
                    copyResult = this.computeIS(whereBlock[k], copyResult);
                    break;
                case "LT":
                    copyResult = this.computeLT(whereBlock[k], copyResult);
                    break;
                case "GT":
                    copyResult = this.computeGT(whereBlock[k], copyResult);
                    break;
                case "EQ":
                    copyResult = this.computeEQ(whereBlock[k], copyResult);
                    break;
                default:
                    copyResult = [];
                    throw new InsightError("the Where block does not contain any of the correct keys");
            }
        }
        return copyResult;
    }
    public computeAND(andBlock: any, result: any): any {
        let copyResult = result;
        let condition = true;
        if (!(andBlock.length > 0)) {
            throw new InsightError("the AND block doesn't have more than zero keys");
        }
        for (let andKey of andBlock) {
            if (condition === false) {
                break;
            }
            let keys = Object.keys(andKey);
            if (keys.length !== 1) {
                throw new InsightError("The Object within AND has the incorrect amount of keys");
            }
            switch (keys[0]) {
                case "AND":
                    let andResult = this.computeAND(andKey.AND, copyResult);
                    if (andResult === false) {
                        condition = false;
                    } else {
                        copyResult = andResult;
                    }
                    break;
                case "OR":
                    let orResult = this.computeOR(andKey.OR, copyResult);
                    if (orResult === false) {
                        condition = false;
                    } else {
                        copyResult = orResult;
                    }
                    break;
                case "NOT":
                    let notResult = this.computeNOT(andKey.NOT, copyResult);
                    if (notResult.length === 0) {
                        condition = false;
                    } else {
                        copyResult = notResult;
                    }
                    break;
                case "IS":
                    let isResult = this.computeIS(andKey.IS, copyResult);
                    if (isResult.length === 0) {
                        condition = false;
                    } else {
                        copyResult = isResult;
                    }
                    break;
                case "LT":
                    let lessResult = this.computeLT(andKey.LT, copyResult);
                    if (lessResult.length === 0) {
                        condition = false;
                    } else {
                        copyResult = lessResult;
                    }
                    break;
                case "GT":
                    let greaterResult = this.computeGT(andKey.GT, copyResult);
                    if (greaterResult.length === 0) {
                        condition = false;
                    } else {
                        copyResult = greaterResult;
                    }
                    break;
                case "EQ":
                    let equalResult = this.computeEQ(andKey.EQ, copyResult);
                    if (equalResult.length === 0) {
                        condition = false;
                    } else {
                        copyResult = equalResult;
                    }
                    break;
                default:
                    throw new InsightError("the AND block doesn't contain a correct key");
            }
        }
        if (condition === false) {
            return condition;
        } else {
            return copyResult;
        }
    }
    public computeOR(orBlock: any, result: any): any {
        let copyResult: any = [];
        let condition = false;
        if (!(orBlock.length > 0)) {
            throw new InsightError("the OR block doesn't have more than zero keys");
        }
        for (let orKey of orBlock) {
            let keys = Object.keys(orKey);
            if (keys.length !== 1) {
                throw new InsightError("The Object within OR has the incorrect amount of keys");
            }
            switch (keys[0]) {
                case "AND":
                    let andResult = this.computeAND(orKey.AND, result);
                    if (andResult === false) {
                        break;
                    } else {
                        copyResult = copyResult.concat(andResult);
                        condition = true;
                    }
                    break;
                case "OR":
                    let orResult = this.computeOR(orKey.OR, result);
                    if (orResult === false) {
                        break;
                    } else {
                        copyResult = copyResult.concat(orResult);
                        condition = true;
                    }
                    break;
                case "NOT":
                    let notResult = this.computeNOT(orKey.NOT, result);
                    if (notResult.length === 0) {
                        break;
                    } else {
                        copyResult = copyResult.concat(notResult);
                        condition = true;
                    }
                    break;
                case "IS":
                    let isResult = this.computeIS(orKey.IS, result);
                    if (isResult.length === 0) {
                        break;
                    } else {
                        copyResult = copyResult.concat(isResult);
                        condition = true;
                    }
                    break;
                case "LT":
                    let lessResult = this.computeLT(orKey.LT, result);
                    if (lessResult.length === 0) {
                        break;
                    } else {
                        copyResult = copyResult.concat(lessResult);
                        condition = true;
                    }
                    break;
                case "GT":
                    let greaterResult = this.computeGT(orKey.GT, result);
                    if (greaterResult.length === 0) {
                        break;
                    } else {
                        copyResult = copyResult.concat(greaterResult);
                        condition = true;
                    }
                    break;
                case "EQ":
                    let equalResult = this.computeEQ(orKey.EQ, result);
                    if (equalResult.length === 0) {
                        break;
                    } else {
                        copyResult = copyResult.concat(equalResult);
                        condition = true;
                    }
                    break;
                default:
                    throw new InsightError("the OR block doesn't contain a correct key");
            }
        }
        if (condition === false) {
            return condition;
        } else {
            return this.unique(copyResult);
        }
    }
    public unique(array: any): object[] {
        let valueString: string = "";
        if (this.kind === "courses") {
            valueString = "uuid";
        } else if (this.kind === "rooms") {
            valueString = "name";
        }
        let m: any = {};
        let newArray = [];
        for (let element of array) {
            let value: string = element[valueString];
            if (!m[value]) {
                newArray.push(element);
                m[value] = true;
            }
        }
        return newArray;
    }
    public computeNOT(notBlock: any, result: any): any {
        let notKeys = Object.keys(notBlock);
        let copyResult = result;
        if (notKeys.length !== 1) {
            throw new InsightError("The Not Block doesn't contain 1 key");
        }
        for (let notKey of notKeys) {
            switch (notKey) {
                case "AND":
                    let andResult = this.computeAND(notBlock[notKey], copyResult);
                    if (!(andResult === false)) {
                        copyResult = copyResult.filter((item: any) => andResult.indexOf(item) < 0);
                    }
                    break;
                case "OR":
                    let orResult = this.computeOR(notBlock[notKey], copyResult);
                    if (!(orResult === false)) {
                        copyResult = copyResult.filter((item: any) => orResult.indexOf(item) < 0);
                    }
                    break;
                case "NOT":
                    let notResult = this.computeNOT(notBlock[notKey], copyResult);
                    copyResult = copyResult.filter((item: any) => notResult.indexOf(item) < 0);
                    break;
                case "IS":
                    let isResult = this.computeIS(notBlock[notKey], copyResult);
                    copyResult = copyResult.filter((item: any) => isResult.indexOf(item) < 0);
                    break;
                case "LT":
                    let lessResult = this.computeLT(notBlock[notKey], copyResult);
                    copyResult = copyResult.filter((item: any) => lessResult.indexOf(item) < 0);
                    break;
                case "GT":
                    let greaterResult = this.computeGT(notBlock[notKey], copyResult);
                    copyResult = copyResult.filter((item: any) => greaterResult.indexOf(item) < 0);
                    break;
                case "EQ":
                    let equalResult = this.computeEQ(notBlock[notKey], copyResult);
                    copyResult = copyResult.filter((item: any) => equalResult.indexOf(item) < 0);
                    break;
                default:
                    throw new InsightError("The NOT block does not contain the correct key");
            }
        }
        return copyResult;
    }
    public computeIS(isBlock: any, result: object[]): object[] {
        let option = 0;
        let isKeys = Object.keys(isBlock);
        if (!(isKeys.length === 1)) {
            throw new InsightError("The IS block does not contain only 1 key");
        } else if (!(isKeys[0].includes("_"))) {
            throw new InsightError("The IS block key doesn't contain _");
        }
        let array: string[] = isKeys[0].split("_", 2);
        if (!(array[0] === this.id)) {
            throw new InsightError("The IS block key does not match the id");
        }
        if (!(this.validStringKeys.includes(array[1]))) {
            throw new InsightError("The IS block key is not included in Valid String Keys");
        }
        if (typeof isBlock[isKeys[0]] !== this.typeOfKeys[array[1]]) {
            throw new InsightError("The IS block data is not correct");
        }
        let iString: string = isBlock[isKeys[0]];
        if (iString.includes("*")) {
            if (iString.startsWith("*")
                && iString.endsWith("*")
                && iString.replace(/[^*]/g, "").length === 2) {
                option = 1;
                let arr: string[] = iString.split("*", 2);
                iString = arr[1];
            } else if (iString.startsWith("*")
                && iString.replace(/[^*]/g, "").length === 1) {
                option = 2;
                let arr: string[] = iString.split("*", 2);
                iString = arr[1];
            } else if (iString.endsWith("*")
                && iString.replace(/[^*]/g, "").length === 1) {
                option = 3;
                let arr: string[] = iString.split("*", 2);
                iString = arr[0];
            } else {
                throw new InsightError("The IS block data contains * at incorrect position");
            }
        }
        function isValue(obj: any) {
            let s: string = obj[array[1]];
            let bool: any;
            switch (option) {
                case 0:
                    bool = (s === iString);
                    break;
                case 1:
                    bool = (s.includes(iString));
                    break;
                case 2:
                    bool = (s.endsWith(iString));
                    break;
                case 3:
                    bool = (s.startsWith(iString));
                    break;
            }
            return bool;
        }
        return result.filter(isValue);

    }
    public computeLT(lessBlock: any, result: object[]): object[] {
        let lessKeys = Object.keys(lessBlock);
        if (!(lessKeys.length === 1)) {
            throw new InsightError("The LT block does not contain only 1 key");
        } else if (!(lessKeys[0].includes("_"))) {
            throw new InsightError("The LT block key doesn't contain _");
        }
        let array: string[] = lessKeys[0].split("_", 2);
        if (!(array[0] === this.id)) {
            throw new InsightError("The LT block key does not match the id");
        }
        if (!(this.validNumberKeys.includes(array[1]))) {
            throw new InsightError("The LT block key is not included in Valid Number Keys");
        }
        if (typeof lessBlock[lessKeys[0]] !== this.typeOfKeys[array[1]]) {
            throw new InsightError("The LT block data is not correct");
        }
        function lessValue(obj: any) {
            return obj[array[1]] < lessBlock[lessKeys[0]];
        }
        return result.filter(lessValue);
    }
    public computeGT(greaterBlock: any, result: object[]): object[] {
        let greaterKeys = Object.keys(greaterBlock);
        if (!(greaterKeys.length === 1)) {
            throw new InsightError("The GT block does not contain only 1 key");
        } else if (!(greaterKeys[0].includes("_"))) {
            throw new InsightError("The GT block key doesn't contain _");
        }
        let array: string[] = greaterKeys[0].split("_", 2);
        if (!(array[0] === this.id)) {
            throw new InsightError("The GT block key does not match the id");
        }
        if (!(this.validNumberKeys.includes(array[1]))) {
            throw new InsightError("The GT block key is not included in Valid Number Keys");
        }
        if (typeof greaterBlock[greaterKeys[0]] !== this.typeOfKeys[array[1]]) {
            throw new InsightError("The GT block data is not correct");
        }
        function greaterValue(obj: any) {
            return obj[array[1]] > greaterBlock[greaterKeys[0]];
        }
        return result.filter(greaterValue);
    }
    public computeEQ(equalBlock: any, result: object[]): object[] {
        let equalKeys = Object.keys(equalBlock);
        if (!(equalKeys.length === 1)) {
            throw new InsightError("The EQ block does not contain only 1 key");
        } else if (!(equalKeys[0].includes("_"))) {
            throw new InsightError("The EQ block key doesn't contain _");
        }
        let array: string[] = equalKeys[0].split("_", 2);
        if (!(array[0] === this.id)) {
            throw new InsightError("The EQ block key does not match the id");
        }
        if (!(this.validNumberKeys.includes(array[1]))) {
            throw new InsightError("The EQ block key is not included in Valid Number Keys");
        }
        if (typeof equalBlock[equalKeys[0]] !== this.typeOfKeys[array[1]]) {
            throw new InsightError("The EQ block data is not correct");
        }
        function equalValue(obj: any) {
            return obj[array[1]] === equalBlock[equalKeys[0]];
        }
        return result.filter(equalValue);
    }
}
