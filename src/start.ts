import { start } from './index';

start({
  enableOAS: true,//process.env.ENABLE_OAS === 'true',
  clientMode: 'new',
  unleashUrl: 'https://us.app.unleash-hosted.com/usii0012/api/',
  unleashApiToken: 'uwo:development.ac6e32d9cfc0537aa6685e31c506a3d0f9cbf4addc48f89e76e2b1be',
  clientKeys: ['proxy-secret', 'another-proxy-secret', 's1'],
  serverSideSdkConfig: {
    tokens: ['server'],
  },
  enableAllEndpoint: true,
});
