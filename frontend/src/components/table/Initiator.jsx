import React from 'react';
import Spreadsheet from './Table'; // Adjust the path as needed

const MyPage = () => {
    const initialData = [
        ["A1", "B1", "C1"],
        ["A2", "B2", "C2"],
        ["A3", "B3", "C3"],
    ];

    return (
        <div>
            <Spreadsheet initialData={initialData} />
        </div>
    );
};

export default MyPage;