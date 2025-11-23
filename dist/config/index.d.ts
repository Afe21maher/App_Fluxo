export declare const config: {
    hedera: {
        network: string;
        accountId: string;
        privateKey: string;
    };
    evvm: {
        mateProtocolAddress: string;
        sepoliaRpcUrl: string;
        sepoliaPrivateKey: string;
        mateStaking: string;
        mateNameService: string;
        mateTreasury: string;
        mateP2PSwap: string;
    };
    xmtp: {
        privateKey: string;
        env: "production" | "dev";
    };
    mesh: {
        port: number;
        bootstrapNodes: string[];
    };
    app: {
        nodeEnv: string;
        logLevel: string;
        port: number;
    };
};
//# sourceMappingURL=index.d.ts.map