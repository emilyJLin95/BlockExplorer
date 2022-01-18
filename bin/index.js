#! /usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createReport } from "./utils.js";

const argv = yargs(hideBin(process.argv))
    .usage("blockexplr <command>\n\nA simple blockchain explorer")
    .command("describe <start> [end]", "Provides a report on transaction data over a range of blocks",
        (yargs) => {
            yargs.positional("start", {
                describe: `If end is unspecified, this represents how farback from the present block the data should be queried`,
                type: "number",
            })
            .positional("end", {
                describe: `If specified, start and end represent the range (inclusive) over which data should be queried`,
                type: "number"
            })
            .option("web3", {
                alias:"web3Provider",
                describe: "The web3 provider. Default is ganache.",
                type: "string",
                demandOption: false,
                default: "http://localhost:7545",
            })
            .option("ojson", {
                describe: "Outputs data in json format",
                type: "boolean",
                default: false,
                demandOption: false
            })
        },
        (argv) => { createReport(argv) }
    ) 
    .demandCommand(1, 'You need a command before moving on')
    .check((argv) => {
        if (argv.start < 0 || argv.end < 0) {
            throw new Error("Only positive values may be passed")
        } else if (argv.end < argv.start) {
            throw new Error("End block must come after start block")
        } else {
            return true
        }
    })                                                                                              
    .help(true)  
    .argv;
