export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "South America" | "Oceania"

export interface Country {
  name: string
  continent: Continent
  aliases?: string[]
}

const groups: Record<Continent, string[]> = {
  Africa: ["Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros", "Democratic Republic of the Congo", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Republic of the Congo", "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"],
  Asia: ["Afghanistan", "Armenia", "Azerbaijan", "Bahrain", "Bangladesh", "Bhutan", "Brunei", "Cambodia", "China", "Cyprus", "Georgia", "India", "Indonesia", "Iran", "Iraq", "Israel", "Japan", "Jordan", "Kazakhstan", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Malaysia", "Maldives", "Mongolia", "Myanmar", "Nepal", "North Korea", "Oman", "Pakistan", "Palestine", "Philippines", "Qatar", "Saudi Arabia", "Singapore", "South Korea", "Sri Lanka", "Syria", "Taiwan", "Tajikistan", "Thailand", "Timor-Leste", "Turkey", "Turkmenistan", "United Arab Emirates", "Uzbekistan", "Vietnam", "Yemen"],
  Europe: ["Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria", "Croatia", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Holy See", "Hungary", "Iceland", "Ireland", "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Ukraine", "United Kingdom"],
  "North America": ["Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Canada", "Costa Rica", "Cuba", "Dominica", "Dominican Republic", "El Salvador", "Grenada", "Guatemala", "Haiti", "Honduras", "Jamaica", "Mexico", "Nicaragua", "Panama", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Trinidad and Tobago", "United States"],
  "South America": ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela"],
  Oceania: ["Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", "New Zealand", "Palau", "Papua New Guinea", "Samoa", "Solomon Islands", "Tonga", "Tuvalu", "Vanuatu"],
}

const aliases: Record<string, string[]> = {
  "Bosnia and Herzegovina": ["bosnia"], "Cabo Verde": ["cape verde"], Czechia: ["czech republic"],
  "Democratic Republic of the Congo": ["drc", "dr congo", "congo kinshasa"], Eswatini: ["swaziland"],
  "Holy See": ["vatican", "vatican city"], "Ivory Coast": ["cote divoire", "cote d ivoire"],
  Micronesia: ["federated states of micronesia"], Moldova: ["republic of moldova"], Myanmar: ["burma"],
  "North Korea": ["dprk"], "North Macedonia": ["macedonia"], Palestine: ["state of palestine"],
  "Republic of the Congo": ["congo", "congo brazzaville"], Russia: ["russian federation"],
  "Sao Tome and Principe": ["sao tome"], "South Korea": ["korea", "republic of korea"],
  Syria: ["syrian arab republic"], Tanzania: ["united republic of tanzania"], "Timor-Leste": ["east timor"],
  Turkey: ["turkiye"], "United Arab Emirates": ["uae"], "United Kingdom": ["uk", "great britain", "britain"],
  "United States": ["usa", "us", "united states of america", "america"], Vietnam: ["viet nam"],
}

export const CONTINENTS = Object.keys(groups) as Continent[]
export const COUNTRIES: Country[] = CONTINENTS.flatMap((continent) =>
  groups[continent].map((name) => ({ name, continent, aliases: aliases[name] }))
)

export function normalizeCountry(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
}
