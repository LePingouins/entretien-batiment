const sections = [
  {
    title: 'Information we collect',
    content: (
      <>
        <p>
          Entretien Bâtiment is a work-management app provided through an
          organization. Depending on the features your organization enables,
          the app may process:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information:</strong> your email address,
            authentication and session information, role, and access
            permissions.
          </li>
          <li>
            <strong>Location and trip information:</strong> GPS coordinates and
            timestamps while you actively record a trip, along with trip
            addresses, stops, route, distance, and related notes. Location
            tracking may continue in the background during an active trip if
            you grant background-location permission.
          </li>
          <li>
            <strong>Photos and files:</strong> images, receipts, and documents
            you choose to attach to work orders, trips, expenses, or other
            work records.
          </li>
          <li>
            <strong>Work and notification information:</strong> work-order and
            expense details, in-app notification records, and, if you allow
            push notifications, your device's push token and platform.
          </li>
          <li>
            <strong>Operational records:</strong> activity and audit
            information needed to operate, protect, and troubleshoot the
            service.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'How we use information',
    content: (
      <p>
        Information is used to authenticate users, provide the work-management
        features requested by your organization, record and calculate work
        trips, associate uploaded files with work records, deliver
        notifications, maintain service security, and troubleshoot issues.
        Your organization may use work records for its operational,
        reimbursement, and record-keeping purposes.
      </p>
    ),
  },
  {
    title: 'Location and mapping services',
    content: (
      <p>
        GPS is used for trip recording when you start or continue a trip and
        have granted the required device permissions. Coordinates may be sent
        to the Entretien Bâtiment production server and to mapping services
        used for address lookup or route-distance calculations, including
        OpenStreetMap's Nominatim service, OSRM, and Google Routes where
        configured. These providers process the location information they
        receive under their own privacy terms.
      </p>
    ),
  },
  {
    title: 'Photos, documents, and notifications',
    content: (
      <p>
        Files are uploaded when you choose to attach them to a work record and
        are made available to users authorized by your organization.
        Notifications are delivered within the app. If you enable push
        notifications, the app registers a device token with Expo's push
        notification service so notifications can reach your device. You can
        change notification and location permissions in your device settings.
        Notification previews may be visible on your lock screen depending on
        your device settings.
      </p>
    ),
  },
  {
    title: 'Server communication and sharing',
    content: (
      <p>
        The mobile app communicates with the Entretien Bâtiment production
        server at entretien-batiment.com to provide its features and sync
        information. Information is shared with your organization and
        authorized users as needed to provide the service, and with the
        providers described above for mapping and push notifications. We do not
        sell personal information.
      </p>
    ),
  },
  {
    title: 'How information is protected',
    content: (
      <p>
        Production server connections use HTTPS. Access to app information is
        controlled through user accounts, roles, and permissions. On supported
        mobile devices, authentication tokens are stored using the platform's
        secure storage facilities. No method of transmission or storage is
        completely secure, but reasonable safeguards are used to protect
        information.
      </p>
    ),
  },
  {
    title: 'Retention, access, and deletion requests',
    content: (
      <p>
        Information is retained for as long as needed to provide the service
        and for your organization's operational, legal, and record-keeping
        requirements. Retention periods can therefore vary by organization and
        record type. To request access, correction, or deletion of your account
        or information, contact your organization's administrator or usual
        support contact. They can review the request and coordinate it with
        Horizon Nature. Some records may need to be retained for legal,
        security, or business reasons; copies in backups may remain until
        routine backup rotation.
      </p>
    ),
  },
  {
    title: 'Contact',
    content: (
      <p>
        For privacy questions or requests, contact the administrator of the
        organization that provided your account, using the support contact
        details provided to you by that organization. The administrator can
        direct your request to Horizon Nature, which operates the Entretien
        Bâtiment service.
      </p>
    ),
  },
];

const frenchSections = [
  {
    title: 'Renseignements recueillis',
    content: (
      <>
        <p>
          Entretien Bâtiment est une application de gestion du travail fournie
          par l'intermédiaire d'une organisation. Selon les fonctions activées,
          l'application peut traiter :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Renseignements de compte :</strong> adresse courriel,
            données d'authentification et de session, rôle et autorisations.
          </li>
          <li>
            <strong>Localisation et déplacements :</strong> coordonnées GPS et
            heures pendant l'enregistrement actif d'un déplacement, ainsi que
            les adresses, arrêts, itinéraires, distances et notes associés. Le
            suivi peut continuer en arrière-plan pendant un déplacement actif
            si l'autorisation de localisation en arrière-plan est accordée.
          </li>
          <li>
            <strong>Photos et fichiers :</strong> images, reçus et documents
            que vous joignez à des bons de travail, déplacements, dépenses ou
            autres dossiers professionnels.
          </li>
          <li>
            <strong>Travail et notifications :</strong> renseignements sur les
            bons de travail et dépenses, notifications dans l'application et,
            si les notifications poussées sont autorisées, jeton de
            notification de l'appareil et plateforme.
          </li>
          <li>
            <strong>Données opérationnelles :</strong> renseignements d'activité
            et de journalisation nécessaires au fonctionnement, à la sécurité
            et au dépannage du service.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Utilisation des renseignements',
    content: (
      <p>
        Les renseignements servent à authentifier les utilisateurs, fournir
        les fonctions demandées par votre organisation, enregistrer et calculer
        les déplacements professionnels, associer les fichiers aux dossiers,
        transmettre des notifications, protéger le service et résoudre les
        problèmes. Votre organisation peut utiliser les dossiers à des fins
        opérationnelles, de remboursement et de tenue de dossiers.
      </p>
    ),
  },
  {
    title: 'Localisation et services cartographiques',
    content: (
      <p>
        Le GPS sert à enregistrer un déplacement lorsque vous le démarrez ou le
        poursuivez et que vous avez accordé les autorisations requises. Les
        coordonnées peuvent être envoyées au serveur de production
        d'Entretien Bâtiment et aux services cartographiques utilisés pour la
        recherche d'adresses ou le calcul d'itinéraires, notamment Nominatim
        d'OpenStreetMap, OSRM et Google Routes lorsque configuré. Ces
        fournisseurs traitent les renseignements reçus conformément à leurs
        propres politiques de confidentialité.
      </p>
    ),
  },
  {
    title: 'Photos, documents et notifications',
    content: (
      <p>
        Les fichiers sont téléversés lorsque vous choisissez de les joindre à
        un dossier professionnel et sont accessibles aux utilisateurs autorisés
        par votre organisation. Les notifications sont offertes dans
        l'application. Si vous activez les notifications poussées,
        l'application enregistre un jeton d'appareil auprès du service de
        notification poussée d'Expo. Vous pouvez modifier les autorisations de
        notification et de localisation dans les réglages de votre appareil.
        Selon ces réglages, l'aperçu des notifications peut apparaître sur
        l'écran verrouillé.
      </p>
    ),
  },
  {
    title: 'Communication avec le serveur et partage',
    content: (
      <p>
        L'application mobile communique avec le serveur de production
        d'Entretien Bâtiment à entretien-batiment.com pour fournir ses fonctions
        et synchroniser les renseignements. Ceux-ci sont partagés avec votre
        organisation et les utilisateurs autorisés, selon les besoins du
        service, ainsi qu'avec les fournisseurs décrits ci-dessus pour les
        cartes et les notifications poussées. Nous ne vendons pas de
        renseignements personnels.
      </p>
    ),
  },
  {
    title: 'Protection des renseignements',
    content: (
      <p>
        Les connexions au serveur de production utilisent HTTPS. L'accès aux
        renseignements est contrôlé au moyen de comptes, de rôles et
        d'autorisations. Sur les appareils mobiles compatibles, les jetons
        d'authentification sont conservés à l'aide des fonctions de stockage
        sécurisé de la plateforme. Aucun mode de transmission ou de stockage
        n'est parfaitement sûr, mais des mesures raisonnables sont prises pour
        protéger les renseignements.
      </p>
    ),
  },
  {
    title: 'Conservation, accès et demandes de suppression',
    content: (
      <p>
        Les renseignements sont conservés aussi longtemps que nécessaire pour
        fournir le service et respecter les exigences opérationnelles,
        juridiques et de tenue de dossiers de votre organisation. La durée
        varie donc selon l'organisation et le type de dossier. Pour demander
        l'accès à vos renseignements, leur correction ou la suppression de
        votre compte ou de vos renseignements, communiquez avec
        l'administrateur de votre organisation ou son soutien habituel. Il
        pourra examiner la demande et la coordonner avec Horizon Nature.
        Certains dossiers peuvent devoir être conservés pour des motifs
        juridiques, de sécurité ou d'affaires; des copies de sauvegarde
        peuvent subsister jusqu'à leur rotation habituelle.
      </p>
    ),
  },
  {
    title: 'Nous joindre',
    content: (
      <p>
        Pour toute question ou demande relative à la confidentialité,
        communiquez avec l'administrateur de l'organisation qui vous a fourni
        votre compte, en utilisant les coordonnées de soutien qu'elle vous a
        transmises. L'administrateur pourra acheminer votre demande à
        Horizon Nature, qui exploite le service Entretien Bâtiment.
      </p>
    ),
  },
];

function PolicySections({
  items,
  language,
}: {
  items: typeof sections;
  language: string;
}) {
  return (
    <div className="space-y-6">
      {items.map(({ title, content }, index) => (
        <section key={title} aria-labelledby={`${language}-privacy-${index}`}>
          <h3
            id={`${language}-privacy-${index}`}
            className="mb-2 text-lg font-semibold text-slate-900"
          >
            {title}
          </h3>
          <div className="space-y-3 text-sm leading-7 text-slate-700">
            {content}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <a
          href="/"
          className="text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          Horizon Nature
        </a>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Entretien Bâtiment · Last updated October 11, 2026
        </p>
        <p className="mt-6 leading-7 text-slate-700">
          This policy explains how Entretien Bâtiment handles information
          through its mobile app and related services. The app is provided
          through organizations for work purposes.
        </p>
        <div className="mt-8">
          <PolicySections items={sections} language="en" />
        </div>

        <hr className="my-10 border-slate-200" />

        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Politique de confidentialité
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Entretien Bâtiment · Mise à jour le 11 octobre 2026
        </p>
        <p className="mt-6 leading-7 text-slate-700">
          Cette politique explique comment Entretien Bâtiment traite les
          renseignements au moyen de son application mobile et de ses services
          connexes. L'application est fournie par l'intermédiaire
          d'organisations à des fins professionnelles.
        </p>
        <div className="mt-8">
          <PolicySections items={frenchSections} language="fr" />
        </div>
      </article>
    </main>
  );
}
