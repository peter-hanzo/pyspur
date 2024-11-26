import React from 'react';
import { useRouter } from 'next/router';
// import ReadOnlyCanvas from '../../../components/ReadOnlyCanvas';

const TracePage = () => {
  const router = useRouter();
  const { id, traceId } = router.query;
  // console.log(router.query);

  return (
    <div>
      <h2>Workflow ID: {id}</h2>
      <h2>Version: {traceId}</h2>
      {/* <ReadOnlyCanvas /> */}
    </div>
  );
};

export default TracePage;