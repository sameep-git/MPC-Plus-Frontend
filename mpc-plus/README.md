
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm  run  dev
# or
yarn  dev
# or
pnpm  dev
# or
bun  dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Directory structure:

```/app```: This is where the main source code is stored for all of the pages that you can see on the website. A folder inside of this directory is a different route with the name of the folder. Ex: ```/mpc-result``` is a folder inside with ```page.tsx```, so when you go to [http://localhost:3000/mpc-result](http://localhost:3000/mpc-result), it will load that ```page.tsx``` in ```mpc-result/```.

```/components```: This is where the source code for the components is stored, ex: Navbar, UserMenu, Button, etc. to make sure our product is maintainable and extensible.

```/constants```: This is where we store all the text or numbers that are constant and don't need to be changed or follow a certain pattern. Ex: If we want to change our product name in the future, we won't have to find all of the different times we have written our old product name, we just have to edit the constant in the folder and it will change the name automatically throughout the website.

```/lib```: This folder contains the API requests made using ```api.ts``` for getting updated data for the website.
