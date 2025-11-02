import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";

import Index from "./pages/Index";
import NipRedirect from "./pages/NipRedirect";
import ResourcesPage from "./pages/ResourcesPage";
import CreateNipPage from "./pages/CreateNipPage";
import EditNipPage from "./pages/EditNipPage";
import NotificationsPage from "./pages/NotificationsPage";
import KindPage from "./pages/KindPage";
import Nip19Page from "./pages/Nip19Page";
import AppsPage from "./pages/AppsPage";
import AppsByTagPage from "./pages/AppsByTagPage";
import SubmitAppPage from "./pages/SubmitAppPage";
import EditAppPage from "./pages/EditAppPage";
import RepositoriesPage from "./pages/RepositoriesPage";
import AnnounceRepositoryPage from "./pages/AnnounceRepositoryPage";
import EditRepositoryPage from "./pages/EditRepositoryPage";
import CreateIssuePage from "./pages/CreateIssuePage";
import RepositoryPage from "./pages/RepositoryPage";
import PatchPage from "./pages/PatchPage";
import DVMPage from "./pages/DVMPage";
import NotFound from "./pages/NotFound";
import IssuePage from "./pages/IssuePage";
import SearchPage from "./pages/SearchPage";

export function AppRouter() {
  const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<AppsPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/nips" element={<Index />} />
        <Route path="/nip/:id" element={<NipRedirect />} />
        <Route path="/create" element={<CreateNipPage />} />
        <Route path="/edit/:naddr" element={<EditNipPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/apps/t/:tag" element={<AppsByTagPage />} />
        <Route path="/apps/submit" element={<SubmitAppPage />} />
        <Route path="/apps/edit/:naddr" element={<EditAppPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/repositories/create" element={<AnnounceRepositoryPage />} />
        <Route path="/repositories/:naddr/edit" element={<EditRepositoryPage />} />
        <Route path="/repositories/:naddr" element={<RepositoryPage />} />
        <Route path="/repositories/:naddr/issues/create" element={<CreateIssuePage />} />
        <Route path="/repositories/:nip19/issues/:issueId" element={<IssuePage />} />
        <Route path="/repositories/:nip19/patches/:patchId" element={<PatchPage />} />
        <Route path="/dvm" element={<DVMPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/kind/:k" element={<KindPage />} />
        <Route path="/:nip19" element={<Nip19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
