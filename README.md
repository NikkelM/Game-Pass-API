# Game Pass API

![Game Pass API banner](images/GamePassApiBanner.png)

This project provides a quick and easy way to get a list of all games currently available on Xbox Game Pass on a given platform (Console, PC or through EA Play) in a given region.

Using the configuration file, the types and format of a large number of properties can be customized, from simply getting the game's names all the way to fetching store prices at the moment of the request.

Take a look at the section below to see how to use the configuration file, or take the `config.default.json` file as an example and work from there.

## Setup

Run `npm install` to install the required dependencies first.

Following this, create a `config.json` file in the root directory of the project and fill it with your desired [configuration](#configuration).

## Usage

After providing the `config.json` [configuration](#configuration) file, you can run the script using

```bash
node index.js
```

You will find the resulting data in the created `output` folder.

## Configuration

### Schema validation

The project provides an extensive JSON validation schema for the required configuration file, which offers guidance on the possible properties that can be extracted from the API, as well as options for formatting the resulting data.

*Are you missing a property? Feel free to open an issue and I will see what I can do. Alternatively, fork the repository and open a Pull Request.*

The schema can be found in the `config.schema.json` file and used within your `config.json` by adding the following property:

```json
"$schema": "./config.schema.json"
```

*NOTE: The script will test your provided `config.json` against this schema, so make sure your configuration is valid.*

### Properties

The following is a list of all configuration items, their defaults and the values they can take.

If a given property is not present in the configuration file, it will automatically be assumed to have a value of `false` (or equivalent, depending on the property type).

#### Top-level properties

<details>
<summary><code>markets</code></summary>

The two letter market codes for which to fetch games. The script will run once for each market code.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `array` | `["US"]` | `"US"`, `"DZ"`, `"AR"`, `"AU"`, `"AT"`, `"BH"`, `"BD"`, `"BE"`, `"BR"`, `"BG"`, `"CA"`, `"CL"`, `"CN"`, `"CO"`, `"CR"`, `"HR"`, `"CY"`, `"CZ"`, `"DK"`, `"EG"`, `"EE"`, `"FI"`, `"FR"`, `"DE"`, `"GR"`, `"GT"`, `"HK"`, `"HU"`, `"IS"`, `"IN"`, `"ID"`, `"IQ"`, `"IE"`, `"IL"`, `"IT"`, `"JP"`, `"JO"`, `"KZ"`, `"KE"`, `"KW"`, `"LV"`, `"LB"`, `"LI"`, `"LT"`, `"LU"`, `"MY"`, `"MT"`, `"MR"`, `"MX"`, `"MA"`, `"NL"`, `"NZ"`, `"NG"`, `"NO"`, `"OM"`, `"PK"`, `"PE"`, `"PH"`, `"PL"`, `"PT"`, `"QA"`, `"RO"`, `"RU"`, `"SA"`, `"RS"`, `"SG"`, `"SK"`, `"SI"`, `"ZA"`, `"KR"`, `"ES"`, `"SE"`, `"CH"`, `"TW"`, `"TH"`, `"TT"`, `"TN"`, `"TR"`, `"UA"`, `"AE"`, `"GB"`, `"VN"`, `"YE"`, `"LY"`, `"LK"`, `"UY"`, `"VE"`, `"AF"`, `"AX"`, `"AL"`, `"AS"`, `"AO"`, `"AI"`, `"AQ"`, `"AG"`, `"AM"`, `"AW"`, `"BO"`, `"BQ"`, `"BA"`, `"BW"`, `"BV"`, `"IO"`, `"BN"`, `"BF"`, `"BI"`, `"KH"`, `"CM"`, `"CV"`, `"KY"`, `"CF"`, `"TD"`, `"TL"`, `"DJ"`, `"DM"`, `"DO"`, `"EC"`, `"SV"`, `"GQ"`, `"ER"`, `"ET"`, `"FK"`, `"FO"`, `"FJ"`, `"GF"`, `"PF"`, `"TF"`, `"GA"`, `"GM"`, `"GE"`, `"GH"`, `"GI"`, `"GL"`, `"GD"`, `"GP"`, `"GU"`, `"GG"`, `"GN"`, `"GW"`, `"GY"`, `"HT"`, `"HM"`, `"HN"`, `"AZ"`, `"BS"`, `"BB"`, `"BY"`, `"BZ"`, `"BJ"`, `"BM"`, `"BT"`, `"KM"`, `"CG"`, `"CD"`, `"CK"`, `"CX"`, `"CC"`, `"CI"`, `"CW"`, `"JM"`, `"SJ"`, `"JE"`, `"KI"`, `"KG"`, `"LA"`, `"LS"`, `"LR"`, `"MO"`, `"MK"`, `"MG"`, `"MW"`, `"IM"`, `"MH"`, `"MQ"`, `"MU"`, `"YT"`, `"FM"`, `"MD"`, `"MN"`, `"MS"`, `"MZ"`, `"MM"`, `"NA"`, `"NR"`, `"NP"`, `"MV"`, `"ML"`, `"NC"`, `"NI"`, `"NE"`, `"NU"`, `"NF"`, `"PW"`, `"PS"`, `"PA"`, `"PG"`, `"PY"`, `"RE"`, `"RW"`, `"BL"`, `"MF"`, `"WS"`, `"ST"`, `"SN"`, `"MP"`, `"PN"`, `"SX"`, `"SB"`, `"SO"`, `"SC"`, `"SL"`, `"GS"`, `"SH"`, `"KN"`, `"LC"`, `"PM"`, `"VC"`, `"TJ"`, `"TZ"`, `"TG"`, `"TK"`, `"TO"`, `"TM"`, `"TC"`, `"TV"`, `"UM"`, `"UG"`, `"VI"`, `"VG"`, `"WF"`, `"EH"`, `"ZM"`, `"ZW"`, `"UZ"`, `"VU"`, `"SR"`, `"SZ"`, `"AD"`, `"MC"`, `"SM"`, `"ME"`, `"VA"`, `"NEUTRAL"` | Yes, at least one market code. |
</details>

<details>
<summary><code>language</code></summary>

The language to use when fetching game properties. Properties such as the game description will be in this language.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `string` | `en-us` | `"es-ar"`, `"pt-br"`, `"en-ca"`, `"fr-ca"`, `"es-cl"`, `"es-co"`, `"es-mx"`, `"en-us"`, `"nl-be"`, `"fr-be"`, `"cs-cz"`, `"da-dk"`, `"de-de"`, `"es-es"`, `"fr-fr"`, `"en-ie"`, `"it-it"`, `"hu-hu"`, `"nl-nl"`, `"nb-no"`, `"de-at"`, `"pl-pl"`, `"pt-pt"`, `"de-ch"`, `"sk-sk"`, `"fr-ch"`, `"fi-fi"`, `"sv-se"`, `"en-gb"`, `"el-gr"`, `"ru-ru"`, `"en-au"`, `"en-hk"`, `"en-in"`, `"id-id"`, `"en-my"`, `"en-nz"`, `"en-ph"`, `"en-sg"`, `"vi-vn"`, `"th-th"`, `"ko-kr"`, `"zh-cn"`, `"zh-tw"`, `"ja-jp"`, `"zh-hk"`, `"en-za"`, `"tr-tr"`, `"he-il"`, `"ar-ae"`, `"ar-sa"`  | Yes |
</details>

<details>
<summary><code>platformsToFetch</code></summary>

Which platforms to fetch games for, any of "console", "pc" and "eaPlay".

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `array` | `["console", "pc", "eaPlay"]` | `"console"`, `"pc"`, `"eaPlay"` | Yes, at least one platform. |
</details>

<details>
<summary><code>outputFormat</code></summary>

What kind of format the resulting JSON should use for the cleaned game properties.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `string` | `"array"` | `"array"`: The resulting data structure is an array with its entries being dictionaries holding separate game's proeprties.<br/>`"productTitle"`: The resulting data structure is a dictionary that uses games' title as keys.<br/>`"productId"`: The resulting data structure is a dictionary that uses games' product ID's as keys.<br/>`"0-indexed"`: The resulting data structure is a dictionary that uses rolling integers as keys. | Yes |
</details>

<details>
<summary><code>treatEmptyStringsAsNull</code></summary>

Whether or not to treat empty strings as null values.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | No |
</details>

<details>
<summary><code>keepCompleteProperties</code></summary>

Whether or not to keep the original, complete list of properties for the fetched games. Will be saved in a separate file per platform and market.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `false` | `true` or `false` | No |
</details>

<details>
<summary><code>includedProperties</code></summary>

The properties that should be contained in the cleaned version of the API response.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `object` | Not applicable | See sections below | Yes, and at least one sub-property |
</details>

#### includedProperties

<details>
<summary><code>productTitle</code></summary>

Whether or not to include the title of the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | No |
</details>

<details>
<summary><code>productId</code></summary>

Whether or not to include the product ID of the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | No |
</details>

<details>
<summary><code>developerName</code></summary>

Whether or not to include the name of the developer of the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | No |
</details>

<details>
<summary><code>publisherName</code></summary>

Whether or not to include the name of the publisher of the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | No |
</details>

<details>
<summary><code>categories</code></summary>

Whether or not to include the game's categories. This can be used as tags.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | No |
</details>

<details>
<summary><code>productDescription</code></summary>

Whether or not to include the description of the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `object` | See item below | See sections below | No |

```json
"productDescription": {
	"enabled": true,
	"preferShort": false
}
```

<h3>Possible values</h3>

<h4><code>enabled</code></h4>

Whether or not to include the description of the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | Yes |

<h4><code>preferShort</code></h4>

Whether or not to prefer the short description of the game over the long description.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `false` | `true` or `false` | No |
</details>

<details>
<summary><code>images</code></summary>

Whether or not to include image URL's for the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `object` | See sections below | See sections below | No |

<h3>Possible values</h3>

<h4><code>enabled</code></h4>

Whether or not to include image URL's for the game.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | Yes |

<h4><code>imageTypes</code></h4>

What kinds of images should be considered, and a maximum of many of each type should be chosen. A value of -1 indicates no limit.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `object` | See item below | Any number of image type combinations with values from -1 upwards. | Yes, at least one `imageType`. |

```json
"imageTypes": {
	"TitledHeroArt": -1,
	"SuperHeroArt": -1,
	"Logo": -1,
	"Poster": -1,
	"Screenshot": -1,
	"BoxArt": -1,
	"Hero": -1,
	"BrandedKeyArt": -1,
	"FeaturePromotionalSquareArt": -1
}
```

Description of the various image types:

| Image type | Description | Aspect Ratio | Example |
| --- | --- | --- | --- |
| Screenshot | In-game screenshots. | 16:9 | [Link](https://store-images.s-microsoft.com/image/apps.4677.68326442227858632.03782b23-7f26-4a8e-ba87-177bdf2c3c90.4344f692-1744-4c18-8024-270fd320f63c) |
| TitledHeroArt | Banner featuring the game's name. | 16:9 | [Link](https://store-images.s-microsoft.com/image/apps.12688.68326442227858632.03782b23-7f26-4a8e-ba87-177bdf2c3c90.ef4d4f2f-1865-4fa7-8ec7-8b914cd4dcc0) |
| Poster | Banner featuring the game's name in portrait mode, such as for smartphones. | 2:3 | [Link](https://store-images.s-microsoft.com/image/apps.64810.68326442227858632.03782b23-7f26-4a8e-ba87-177bdf2c3c90.fdefe49f-270c-44e5-b660-6d7764b37f0f) |
| SuperHeroArt | Artwork without text. | 16:9 | [Link](https://store-images.s-microsoft.com/image/apps.62159.68326442227858632.03782b23-7f26-4a8e-ba87-177bdf2c3c90.1405eb3a-6314-4e44-a822-7660d70a6ec5) |
| Hero | Artwork without text. | 2:1 | [Link](https://store-images.s-microsoft.com/image/apps.28129.13672427983916579.274b1ffd-9cde-4bef-9a3e-6f37073d5ed0.5eb8b4f3-3575-4d13-b0a4-b60d6c64f392) |
| BoxArt | Banner featuring the game's logo and name in a square \"box\" format. | 1:1 | [Link](https://store-images.s-microsoft.com/image/apps.4794.68326442227858632.03782b23-7f26-4a8e-ba87-177bdf2c3c90.b156af1e-9796-48af-8d11-3461727280ea) |
| BranedKeyArt | Banner featuring the game's name with an \"XBOX\" logo on top. | 73:100 | [Link](https://store-images.s-microsoft.com/image/apps.27624.68326442227858632.21f49c7b-79d7-4647-b847-ecc7a34a7901.1aa31c66-2a52-45d6-8fed-badfb9f25ac6) |
| FeaturePromotionalSquareArt | Banner featuring the game's logo (without name) in a square \"box\" format. | 1:1 | [Link](https://store-images.s-microsoft.com/image/apps.29819.68326442227858632.03782b23-7f26-4a8e-ba87-177bdf2c3c90.322d4aa6-0a23-4565-a64f-743f0620a96e) |
| Logo | Small, square game logo, to be used e.g. as a game library icon. | 1:1 | [Link](https://store-images.s-microsoft.com/image/apps.65119.13664397958929388.0e87ac81-8aa3-41f0-82dc-61a295fc5fe3.44bf032a-b113-4179-aa1b-f557dbcd3b19) |
</details>

<details>
<summary><code>releaseDate</code></summary>

Whether or not to include the game's release date.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `object` | See item below | See sections below | No |

```json
"releaseDate": {
	"enabled": true,
	"format": "date"
}
```

<h3>Possible Values</h3>

<h4><code>enabled</code></h4>

Whether or not to include the game's release date.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | Yes |

<h4><code>format</code></h4>

How to format the date string. Either the full dateTime (YYYY-MM-DDTHH:mm:ss.sssssssZ) or just the date (YYYY-MM-DD).

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `string` | `"date"` | `"date"` or `"dateTime"` | Yes |
</details>

<details>
<summary><code>userRating</code></summary>

Whether or not to include the game's user rating.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `object` | See item below | See sections below | No |

```json
"userRating": {
	"enabled": true,
	"aggregationInterval": "AllTime",
	"format": "percentage"
}
```

<h3>Possible Values</h3>

<h4><code>enabled</code></h4>

Whether or not to include the game's user rating.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | Yes |

<h4><code>aggregationInterval</code></h4>

Which kind of interval to use for rating aggregation.

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `string` | `"AllTime"` | `"AllTime"`, `"30Days"`, `"7Days"` | Yes |

<h4><code>format</code></h4>

How to format the rating. Either as the original x-out-of-5 stars value (0.0 - 5.0) or as a percentage (0.0 - 1.0).

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `string` | `"percentage"` | `"percentage"` or `"stars"` | Yes |
</details>

<details>
<summary><code>pricing</code></summary>

Whether or not to include the game's price information. The currency that is used is dependent on the chosen \"market\".

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `object` | See item below | See sections below | No |

```json
"pricing": {
	"enabled": true,
	"priceTypes": [
		"ListPrice",
		"MSRP",
		"WholesalePrice"
	],
	"missingPricePolicy": "useZero"
}
```

<h3>Possible Values</h3>

<h4><code>enabled</code></h4>
Whether or not to include the game's price information. The currency that is used is dependent on the chosen \"market\".

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `boolean` | `true` | `true` or `false` | Yes |

<h4><code>priceTypes</code></h4>
Which kinds of prices to include. Choose from ListPrice, MSRP and WholesalePrice (i.e. applied discounts).

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `array` | `["ListPrice", "MSRP", "WholesalePrice"]` | Any combination of:<br/>`"ListPrice"`: The current listing price in the store. <br/>  `"MSRP"`: The manufacturer's suggested retail price.<br/>  `"WholesalePrice"`: The wholesale price, i.e. the ListPrice after sales have been applied. | Yes, at least one `priceType`. |

<h4><code>missingPricePolicy</code></h4>
What to do if a price is missing. Either "useZero", "useNull" or "useEmptyString".

| Type | Default value | Possible values | Required |
| --- | --- | --- | --- |
| `string` | `"useNull"` | `"useZero"`, `"useNull"` or `"useEmptyString"` | Yes |
</details>