import dns from 'dns';

console.log('Original servers:', dns.getServers());
dns.setServers(['8.8.8.8', '8.8.4.4']);
console.log('New servers:', dns.getServers());

const srvRecord = '_mongodb._tcp.cluster0.jjar4ht.mongodb.net';

dns.resolveSrv(srvRecord, (err, addresses) => {
    if (err) {
        console.error('DNS resolveSrv error:', err);
    } else {
        console.log('DNS resolveSrv success:', addresses[0]);
    }
});
