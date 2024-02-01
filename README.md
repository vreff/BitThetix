<img src="logo.svg" alt="drawing" width="200"></img>
# BitThetix

BitThetix is an open-source proof of concept for a synthetic asset platform on Stacks. It is meant to be used purely for educational purposes, not for production applications.

## Video Demo
Attached is a video demonstrating the flow of the BitThetix code, from setting up the developer environment to fully using the Dapp. 

## Repository Structure
This repository is organized into several key directories:

### `bitthetix-contracts`
Contains the Clarity smart contracts that power the BitThetix platform.

- **Settings**: Configuration files for different networks (Mainnet, Devnet, Testnet).
- **Contracts**: The core smart contracts (`bitthetix.clar`, `bitthetix-lp.clar`, `mock-price-feed.clar`, and more).
- **Deployments**: YAML files detailing deployment plans for various environments.

### `frontend`
The frontend directory houses the Next.js-based web application for interacting with the BitThetix platform.

- **App**: Contains the main layout, styling, and page components. The `trade` sub-directory features components specific to trading functionalities.
- **Configuration**: Files like `next.config.js` and `tailwind.config.ts` for project setup and styling.

### `scripts`
Scripts folder containing `populate-onchain-data.js` script that populates on-chain price data and updates it every 2 minutes.

## Getting Started
In order to run bitthetix, you need the following software to be installed: 
- [clarinet](https://github.com/hirosystems/clarinet)
- [yarn](https://yarnpkg.com/)
- [node.js](https://nodejs.org/en/download)
- [Docker](https://www.docker.com/)

Once these dependencies are on your computer, clone this repository. Then, navigate into the project root directory.

```bash
cd bitthetix
```

### Running the local devnet

If Docker is not running, boot Docker up. Then, navigate to the `bitthetix-contracts` directory:

```bash
cd bitthetix-contracts
```

Install dependencies:

```bash
yarn
```

And run the local stacks devnet:

```bash
clarinet devnet start
```

This process may take some time on the first try. Once your local devnet has started and block 5 is mined, navigate to the scripts folder in a new terminal window:

```bash
cd bitthetix/scripts
```

Install dependencies:

```bash
yarn
```

And run the on-chain data script:

```bash
node ./populate-onchain-data.js
```

You should see some output like this:
```
Adding mock feeds on-chain (nonce: 5).
33a6d748793c2db48b9f3eda3e7951e2ffd54fa44b47ec6c22d7e68d9deeee93 {
  txid: '33a6d748793c2db48b9f3eda3e7951e2ffd54fa44b47ec6c22d7e68d9deeee93'
}
Setting supported feeds for Bitthetix on-chain (nonce: 6).
89071c42b00778d3434066eb1081a16c981b1288d19883c49f7c0775767a0237 {
  txid: '89071c42b00778d3434066eb1081a16c981b1288d19883c49f7c0775767a0237'
}
```

You can double check in your local devnet console that two new transactions have been added to the mempool and are being processed.

Once you have populated on-chain data in your local stacks devnet instance, navigate to the frontend directory:

```bash
cd bitthetix/frontend
```

Install dependencies:

```bash
yarn
```

And run the frontend:

```bash
yarn dev
```

You should then be able to navigate to `localhost:3000` and start using the Dapp! For any questions, refer to the demo video as it walks through setting up the application, and feel free to reach out for other issues.

## TODO:

Plenty could be added to this repository, including:
- Margin trading
- Staking sBTC
- More assets
- Support for multiple oracle products
- Actually using multisig for posting on-chain data to the chain (the current implementation is centralized)
- Unit tests for the Clarity contracts
- Mobile UI

## Contributing

Contributions to BitThetix are welcome! Please get in touch or open a pull request to contribute.

## License

MIT License

Copyright (c) [2024] [BitThetix]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.