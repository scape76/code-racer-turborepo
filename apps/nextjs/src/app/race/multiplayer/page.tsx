import { getCurrentUser } from "@/lib/session";
import { type Race as RaceType, prisma } from "@code-racer/db";
import NoSnippet from "../no-snippet";
import Race from "../race";

async function getRandomSnippet(lang: string) {
  const itemCount = await prisma.snippet.count({
    where: {
      onReview: false,
      language: lang,
    },
  });
  const skip = Math.max(0, Math.floor(Math.random() * itemCount));
  const [snippet] = await prisma.snippet.findMany({
    where: {
      onReview: false,
      language: lang,
    },
    take: 1,
    skip: skip,
  });
  return snippet;
}

export default async function MultiplayerRacePage({
  searchParams,
}: {
  searchParams: {
    lang: string;
  };
}) {
  const user = await getCurrentUser();
  const snippet = await getRandomSnippet(searchParams.lang);
  const language = searchParams.lang;

  if (!snippet) {
    return (
      <main className="flex flex-col items-center justify-between py-10 lg:p-24">
        <NoSnippet
          message={"Looks like there is no snippet available yet. Create one?"}
          language={language}
        />
      </main>
    );
  }

  let raceToJoin: RaceType;

  //Fetch available races and join one. if there none, create one.

  const races = await prisma.race.findMany({
    where: {
      endedAt: null,
      snippet: {
        language: language,
      },
    },
  });

  if (races.length === 0) {
    raceToJoin = await prisma.race.create({
      data: {
        participants: {
          create: {
            user: user
              ? {
                  connect: {
                    id: user.id,
                  },
                }
              : undefined,
          },
        },
        snippet: {
          connect: {
            id: snippet.id,
          },
        },
      },
    });
  } else {
    raceToJoin = races[Math.floor(Math.random() * races.length)]!;
  }

  console.log(raceToJoin);

  return (
    <main className="flex flex-col items-center justify-between py-10 lg:p-24">
      <Race snippet={snippet} user={user} raceId={raceToJoin?.id} />
    </main>
  );
}
