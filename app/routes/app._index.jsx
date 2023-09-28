import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  VerticalStack,
  Button,
  LegacyCard,
  Tabs
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session  } = await authenticate.admin(request);

  const shop = session.shop;
  const apiAccessToken = session.accessToken;

  // TODO: Complete this function to fetch the assets from the Shopify API
  // and return the home, product, and collection templates.

  if (shop) {
    try {
      // Make a GET request to fetch the theme

      const response = await fetch(`https://${shop}/admin/api/2022-01/themes.json`, {
        method : "GET",
        headers : {
           "X-Shopify-Access-Token" : `${apiAccessToken}` 
        }
      });

      const data = await response.json();
 
      if (!data.themes) {
        return json({ error: 'Failed to fetch themes from Shopify API' }, { status: 0 });
      }
  
      const mainTheme = data.themes.find((theme) => theme.role === 'main');

      //Check if these templates exists or not... We can also, get all the templates but a/c to requirement, we'll get based on the templates

      const regexPattern = /^templates\/(index|product|collection)(\.\w+)*$/;

      const AssetsData = await fetch(`https://${shop}/admin/api/2023-07/themes/${mainTheme.id}/assets.json`,{
        method : "GET",
        headers: {
          'X-Shopify-Access-Token': `${apiAccessToken}`
        },
      });

      const allAssets = await AssetsData.json();
      const matchingAssets = allAssets.assets.filter((asset) => regexPattern.test(asset.key));
      
      if (matchingAssets.length > 0) {
        return json({ templates : matchingAssets, theme: mainTheme });
      } else {
        return json({ error: 'Main theme ID not found' }, { status: 401 });
      }
    } catch (error) {
      return json({ error: "Internal Server Error" }, { status: 500 });
    }
  } else {
    return json({ error: "Shop is not available in the session" }, { status: 401 });
  }
};

export let action = async ({request}) => {
  const { session  } = await authenticate.admin(request);
  const shop = session.shop
  const apiAccessToken = session.accessToken;
  const formData = await request.formData();
  const payload = Object.fromEntries(formData)

  console.log("formDarta", payload)
  function generateRandomKey(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      key += characters.charAt(randomIndex);
    }
    return key;
  }

  const assetsKey = payload.assetKey;
  let randomTemplate = ""
  if(payload.key == "0") {
     const random = assetsKey.replace(".json", "");
     const randomKey = generateRandomKey(10);
     const newTemplateName = random + "." +  randomKey + ".liquid";
     randomTemplate = newTemplateName;
  } else if (payload.key == "1") {
    const random = assetsKey.replace(".json", "");
    const randomKey = generateRandomKey(10);
    const newTemplateName = random + "." + randomKey + ".liquid";
    randomTemplate = newTemplateName;
  } else {
    const random = assetsKey.replace(".json", "");
    const randomKey = generateRandomKey(10);
    const newTemplateName = random + "." + randomKey + ".liquid";
    randomTemplate = newTemplateName;
  }

  const updateData = await fetch(`https://${shop}/admin/api/2023-01/themes/${payload.assetThemeId}/assets.json`,{
    method : "PUT",
    headers: {
      'X-Shopify-Access-Token': `${apiAccessToken}`,
      'Content-Type': 'application/json',
    },
    body : JSON.stringify({asset : {key : randomTemplate}})
  });

  const updatedTemplate = await updateData.json();
  console.log(updatedTemplate, "update Data")
       
       // TODO: Complete this function to duplicate the selected asset
       // by cre .
       // format should be if homepage then index.{random10-characters-key}.liquid, collection then collection.{random10-characters-key}.liquid, product then product.{random10-characters-key}.liquid
  return json({status: 'success', templateName: randomTemplate, key : payload.key});
};



//Function Starts 

export default function Index() {
  const data  = useLoaderData();
  const [btnLoading, setBtnLoading] = useState(false);

  function organizeData() {
    const organizedData = {
      home: [],
      collection: [],
      product: [],
    };
  
    data.templates.forEach((asset) => {
      // Determine the category based on the asset key
      let category;
      if (asset.key.startsWith('templates/index')) {
        category = 'home';
      } else if (asset.key.startsWith('templates/collection')) {
        category = 'collection';
      } else if (asset.key.startsWith('templates/product')) {
        category = 'product';
      } else {
        // Handle other categories or default behavior
        category = 'other';
      }
  
      // Add the asset to the corresponding category
      organizedData[category].push({
        assetsKey: asset.key,
        themeID: asset.theme_id,
        updateAt: asset.updated_at,
      });
    });
  
    return organizedData;
  }
  const apiDATA = organizeData();
  const submit = useSubmit();

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [cardData, setCardData] = useState(apiDATA);


useEffect(()=> {
   const updatedCardData = organizeData();
   setCardData(updatedCardData);
   setBtnLoading(false);
}, [data])

  const handleDuplicate = async (event) => {
    event.preventDefault();
    setBtnLoading(true);

    // We can also send the payload like this:
    // const payload = {
    //   id : data.id,
    //   themeID : selectedTabIndex === 0 ? cardData.home[0].assetsKey : selectedTabIndex === 1 ? cardData.collection[0].assetsKey : cardData.product[0].assetsKey
    // }
    const id = cardData.home[0].themeID; 
    const formData = new FormData();
    formData.append(
    "assetKey",
    selectedTabIndex === 0
      ? "templates/index.json"
      : selectedTabIndex === 1
      ? "templates/collection.json"
      : "templates/product.json"
  );
  formData.append("assetThemeId", id);
  formData.append("key", selectedTabIndex.toString());
  submit(formData, {method : "PUT"});
  };


  const renderCard = (index) => {
    // TODO: Complete this function to render a card for each asset with its key, theme ID, and updated at time.
    switch (index) {
      case 0:
       return  (
         <>
              {cardData.home.map((homeData, index)=> {
                return(
                      <div className="sd-container" key={index} style={{borderRadius : "3px", margin : "5px 0px"}}>
                          <p><b>Asset Key</b>: {homeData.assetsKey}</p>
                          <p><b>Theme ID</b> : {homeData.themeID}</p>
                          <p><b>Updated At</b> : {homeData.updateAt}</p>
                      </div>
                )
              })}
           
         </>
       )
      case 1:
       return  (
        <>
           {cardData.collection.map((collectionData, index)=> {
              return(
                   <div className="sd-container" key={index} style={{borderRadius : "3px", margin : "5px 0px"}}>
                       <p><b>Asset Key</b>: {collectionData.assetsKey}</p>
                       <p><b>Theme ID</b>: {collectionData.themeID}</p>
                       <p><b>Updated At</b>: {collectionData.updateAt}</p>
                   </div>
              )
           })}
        </>
      )
      case 2:
        return  (
          <>
              {cardData.product.map((productData, index)=> {
                  return(
                      <div className="sd-container" key={index} style={{borderRadius : "3px", margin : "5px 0px"}}>
                          <p><b>Asset Key</b>: {productData.assetsKey}</p>
                          <p><b>Theme ID</b>: {productData.themeID}</p>
                          <p><b>Updated At</b>: {productData.updateAt}</p>
                      </div>
                  )
              })}
          </>
        )
      default:
        break;
    }
  };

  // TODO: Create the Tabs and Panels components and render the assets inside the Panels.

  const handleTabChange = (index) => {
     setSelectedTabIndex(index)
  }

  const tabs = [
    {
      id: 'home-page',
      content: 'Home Pages',
      accessibilityLabel: 'Home Pages',
    },
    {
      id: 'collection-page',
      content: 'Collection Pages',
      accessibilityLabel: 'Collection Pages'
    },
    {
      id: 'product-page',
      content: 'Product Pages',
      accessibilityLabel: 'product Pages'
    },
  ]

  return (
    <Page>
      <ui-title-bar title="Remix app template"></ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            {/* TODO: Render the Tabs and Panels components here */}
            <LegacyCard>
              <Tabs tabs={tabs} selected={selectedTabIndex} onSelect={handleTabChange} fitted>
                <LegacyCard.Section>
                   {renderCard(selectedTabIndex)}
                </LegacyCard.Section>
              </Tabs>
            </LegacyCard>
          </Layout.Section>
        </Layout>
        <Form method="POST" onSubmit={handleDuplicate}>
           {/* <input type="hidden" name="selectedAssetKey" value={selectedTabIndex == 0 ? cardData.home[0].assetsKey : selectedTabIndex == 1 ? cardData.collection[0].assetsKey : cardData.product[0].assetsKey} /> */}
          {/* <input type="hidden" name="selectedAssetThemeId" value={selectedTabIndex == 0 ? cardData.home[0].themeID : selectedTabIndex == 1 ? cardData.collection[0].themeID : cardData.product[0].themeID } />  */}
          <Button
            primary
            submit
            loading = {btnLoading}
            >
            Duplicate Template
          </Button>
            </Form>
      </VerticalStack>
    </Page>
  );
  
}
