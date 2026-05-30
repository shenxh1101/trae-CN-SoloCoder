function processData(items) {
    var total = 0;
    for (var i = 0; i < items.length; i++) {
        total += items[i]
    }
    console.log("Total: " + total)
    debugger;
    if (count > 10) {
        return result
    }
    if (x == 10) {
        return 1
    }
    return total
}

const fs = require('fs');
const content = fs.readFileSync('/tmp/test.txt', 'utf8');
