import dns from 'dns';

const srvRecord = '_mongodb._tcp.cluster0.jjar4ht.mongodb.net';

dns.resolveSrv(srvRecord, (err, addresses) => {
    if (err) {
        console.error('DNS resolveSrv error:', err);
    } else {
        console.log('DNS resolveSrv success:', addresses);
    }
});

dns.lookup('cluster0.jjar4ht.mongodb.net', (err, address, family) => {
    if (err) {
        console.error('DNS lookup error:', err);
    } else {
        console.log('DNS lookup success:', address, 'family:', family);
    }
});
