import moment = require("moment")

export const init_config = {
    'siop': {
        'enabled': false,
        'isRedirection': false,
        'pollPath': '/poll',
        'pollCertPath': '/cert/poll',
        'clientID': 'marketplace-client',
        'callbackURL': 'http://proxy.docker:8004/auth/vc/callback',
        'verifierHost': 'https://verifier.dome-marketplace.org',
        'verifierQRCodePath': '/api/v1/loginQR',
        'requestUri': '/auth/vc/request.jwt'
    },
    'chat': '',
    'knowledgeBaseUrl': 'https://knowledgebase.dome-marketplace-sbx.org/',
    'ticketingUrl': '',
    'matomoId': '',
    'matomoUrl': '',
    'searchEnabled': false,
    'domeAbout': 'https://dome-marketplace.eu/about/',
    'domeRegister': 'https://dome-marketplace.github.io/onboarding/',
    'domePublish': 'https://knowledgebase.dome-marketplace.org/shelves/company-onboarding-process',
    'purchaseEnabled': false,
    'defaultId': 'urn:ngsi-ld:catalog:32828e1d-4652-4f4c-b13e-327450ce83c6'
       
}

export const init_stat = {"_id":"677ff8d160055e7a1e2544ff","services":[],"organizations":[],"__v":0}

export const category_launched = [{
    "id": "urn:ngsi-ld:category:e4522ff8-2f25-4cd8-b30f-04a0caefbdb5",
    "href": "urn:ngsi-ld:category:e4522ff8-2f25-4cd8-b30f-04a0caefbdb5",
    "isRoot": true,
    "lastUpdate": "2025-02-18T14:54:34.145992134Z",
    "lifecycleStatus": "Launched",
    "name": "catalog6"
}]

export const product_offering = []

export const login_token = () => {
    return {
        "provider": "fiware",
        "id": "admin",
        "displayName": "admin",
        "emails": [
            {
                "value": "admin@test.com"
            }
        ],
        "email": "admin@test.com",
        "roles": [
            {
                "id": "1af053c1-44dd-479f-a50f-e0c40a592b2f",
                "name": "customer"
            },
            {
                "id": "2bfb986d-3804-406c-b890-e945694a2ba4",
                "name": "seller"
            },
            {
                "id": "624ae013-e572-4d28-a389-a91fce005317",
                "name": "admin"
            }
        ],
        "organizations": [],
        "appId": "d153323a-b503-40bb-ae42-9d2ca5bbd480",
        "_raw": "",
        "_json": {
            "organizations": [],
            "displayName": "",
            "roles": [
                {
                    "id": "1af053c1-44dd-479f-a50f-e0c40a592b2f",
                    "name": "customer"
                },
                {
                    "id": "2bfb986d-3804-406c-b890-e945694a2ba4",
                    "name": "seller"
                },
                {
                    "id": "624ae013-e572-4d28-a389-a91fce005317",
                    "name": "admin"
                }
            ],
            "app_id": "d153323a-b503-40bb-ae42-9d2ca5bbd480",
            "trusted_apps": [],
            "isGravatarEnabled": "",
            "id": "admin",
            "authorization_decision": "",
            "app_azf_domain": "",
            "eidas_profile": {},
            "attributes": {},
            "shared_attributes": "",
            "username": "admin",
            "email": "admin@test.com",
            "image": "",
            "gravatar": "",
            "extra": ""
        },
        "username": "admin",
        "expire": moment().unix() + 100,
        "partyId": "urn:ngsi-ld:individual:b73dd8ce-b63f-4c5b-be07-ca7ea10ad78e",
        "accessToken": "f10d5c048d9eaf400f3a5d0702e19ebe11172338",
        "refreshToken": "a957fb1afc717c1f44fc6d4523482643019ce58b",
        "idp": "local",
        "orgState": 1
    }
}

export const catalog_launched = [
    {
        "id": "urn:ngsi-ld:catalog:32828e1d-4652-4f4c-b13e-327450ce83c6",
        "href": "urn:ngsi-ld:catalog:32828e1d-4652-4f4c-b13e-327450ce83c6",
        "lifecycleStatus": "Launched",
        "name": "default",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:26435cca-2707-4c89-8f0c-79464573c9e2",
                "href": "urn:ngsi-ld:category:26435cca-2707-4c89-8f0c-79464573c9e2",
                "name": "dft cat"
            }
        ]
    },
    {
        "id": "urn:ngsi-ld:catalog:e7de3de7-d264-45b8-a069-9d84d74842ed",
        "href": "urn:ngsi-ld:catalog:e7de3de7-d264-45b8-a069-9d84d74842ed",
        "description": "",
        "lifecycleStatus": "Launched",
        "name": "catalog6",
        "category": [
            {
                "id": "urn:ngsi-ld:category:e4522ff8-2f25-4cd8-b30f-04a0caefbdb5",
                "href": "urn:ngsi-ld:category:e4522ff8-2f25-4cd8-b30f-04a0caefbdb5",
                "name": "catalog6"
            }
        ],
        "relatedParty": [
            {
                "id": "urn:ngsi-ld:individual:b73dd8ce-b63f-4c5b-be07-ca7ea10ad78e",
                "href": "urn:ngsi-ld:individual:b73dd8ce-b63f-4c5b-be07-ca7ea10ad78e",
                "role": "Owner",
                "@referredType": ""
            }
        ],
        "validFor": {
            "startDateTime": "2025-02-18T14:54:33.557Z"
        }
    }
]

export const local_items = {
    "id": "admin",
    "user": "admin",
    "email": "admin@test.com",
    "token": "f7ecd97a3219a38131a06feebd92d3d7fb98ffff",
    "expire": 1741025677,
    "partyId": "urn:ngsi-ld:individual:b73dd8ce-b63f-4c5b-be07-ca7ea10ad78e",
    "roles": [
      {
        "id": "1af053c1-44dd-479f-a50f-e0c40a592b2f",
        "name": "customer"
      },
      {
        "id": "2bfb986d-3804-406c-b890-e945694a2ba4",
        "name": "seller"
      },
      {
        "id": "624ae013-e572-4d28-a389-a91fce005317",
        "name": "admin"
      }
    ],
    "organizations": [],
    "logged_as": "admin"
  }
