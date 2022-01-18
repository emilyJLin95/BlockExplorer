import _range from "lodash/range.js";
import Table from "cli-table";
import Web3 from "Web3";

async function createReport(argv) {
    try {
        var web3 = new Web3(new Web3.providers.HttpProvider(
            argv.web3
        ));
        var blocks = await getBlocks(argv.start, argv.end, web3);
        if (blocks[0].length == 0) {
            console.log(`There are no blocks between ${argv.start} and ${argv.end}`);
        } else {
            printReport(blocks[0], argv.ojson, web3);
        }
    } catch (err) {
        console.log(err)
    }
}

async function getBlockRange(start, end, web3) {
    // No end was specified, end block is latest block
    if (!end) {
        const currentBlock = await web3.eth.getBlockNumber();
        // Start at 0 if the number requested back exceeds the length of the chain
        return start > currentBlock ? 
            _range(0, currentBlock + 1) : _range(currentBlock - start, currentBlock + 1);
    } else {
        return _range(start, end + 1);
    }
}

async function getBlocks(start, end, web3) {
    console.log("Getting blocks...")
    const range = await getBlockRange(start, end, web3);
    const batch = new web3.eth.BatchRequest();
    var blocks = [];
    let promises = range.map(blockNumber => {
        return new Promise((resolve, reject) => {
            batch.add(
                web3.eth.getBlock.request(blockNumber, true, (err, block) => {
                    if (err) { 
                        reject(err) 
                    } else {
                        if (block != null) {
                            blocks.push(block)
                        }
                        resolve(blocks)
                    }
                })
            );
        });
    });
    batch.execute();
    return Promise.all(promises);
}

async function printReport(blocks, ojson, web3) {
    const senderToEth = new Map();
    const recipientToEth = new Map();
    const contractAddresses = new Set();
    var total = 0;

    console.log("Compiling transaction information...")
    for (let i = 0; i < blocks.length; i++) {
        for (let j = 0; j < blocks[i].transactions.length; j++) {
            let transaction = blocks[i].transactions[j];
            let sender = transaction.from;
            let recipient = transaction.to;
            let value = parseInt(transaction.value);
            total += value;
            addToMap(senderToEth, sender, value);
            addToMap(recipientToEth, recipient, value);
            await collectContractAddresses([sender, recipient], contractAddresses, web3);
        }
    }

    if (ojson) {
        console.log(await getJson(total, senderToEth, recipientToEth, contractAddresses));
    } else {
        console.log(`Total ETH Transferred: ${total}`);
        printTable(["Sender", "Total ETH Sent", "Is Contract"], senderToEth, contractAddresses);
        printTable(["Recipient", "Total ETH Received", "Is Contract"], recipientToEth, contractAddresses);
    }
}

async function collectContractAddresses(addresses, contractAddresses, web3) {
    for (let i = 0; i < addresses.length; i++) {
        let address = addresses[i];
        if (address && !contractAddresses.has(address)) {
            let code = await web3.eth.getCode(address);
            if (code != "0x") {
                contractAddresses.add(address);
            }
        }
    }
}

async function getJson(total, senderToEth, recipientToEth, contractAddresses) {
    var json = {};
    json.total = total;
    json.senders = Array.from(senderToEth.keys()).map((address) => {
            return {
                sender: address,
                value: senderToEth.get(address),
                isContract: contractAddresses.has(address)
            };
        }
    );
    json.recipients = Array.from(recipientToEth.keys()).map((address) => {
            return {
                sender: address,
                value: recipientToEth.get(address),
                isContract: contractAddresses.has(address)
            };
        }
    );
    return json;
}

function printTable(header, map, contractAddresses) {
    var table = new Table({
        head: header, colWidths: [45, 30, 15]
    });

    map.forEach((amt, address) => {
        table.push([address, amt, contractAddresses.has(address)]);
    });

    console.log(table.toString());
}

function addToMap(map, address, value) {
    if (address) {
        map.set(
            address,
            map.has(address) ? map.get(address) + value : value
        );
    }
}

export { createReport }