import React, { useState, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
} from '@nextui-org/react';

const Spreadsheet = ({ initialData = [[]], onDataUpdate }) => {
  const [data, setData] = useState(initialData.length > 0 ? initialData : [[null]]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);

  // Update the parent component's state whenever the table data changes
  useEffect(() => {
    onDataUpdate(data);
  }, [data, onDataUpdate]);

  const getColumnLabel = (colIndex) => String.fromCharCode(65 + colIndex); // A, B, C, ...

  const handleCellChange = (rowIndex, colIndex, value) => {
    const updatedData = [...data];
    updatedData[rowIndex][colIndex] = value;
    setData(updatedData);
  };

  const addRow = (position) => {
    const newRow = Array(data[0].length).fill(null);
    const newData = [...data];
    if (position === 'above') {
      newData.splice(selectedRow, 0, newRow);
    } else {
      newData.splice(selectedRow + 1, 0, newRow);
    }
    setData(newData);
  };

  const addColumn = (position) => {
    const newData = data.map((row) => [...row]);
    newData.forEach((row) => {
      if (position === 'left') {
        row.splice(selectedCol, 0, null);
      } else {
        row.splice(selectedCol + 1, 0, null);
      }
    });
    setData(newData);
  };

  const toggleRowSelection = (rowIndex) => {
    if (selectedRow === rowIndex) {
      setSelectedRow(null); // Deselect if clicking again
    } else {
      setSelectedRow(rowIndex);
      setSelectedCol(null); // Deselect column if a row is selected
    }
  };

  const toggleColumnSelection = (colIndex) => {
    if (selectedCol === colIndex) {
      setSelectedCol(null); // Deselect if clicking again
    } else {
      setSelectedCol(colIndex);
      setSelectedRow(null); // Deselect row if a column is selected
    }
  };

  return (
    <div className="p-4">
      {/* Buttons for adding rows/columns */}
      <div className="flex space-x-2 mb-4">
        {selectedRow !== null && (
          <>
            <Button color="secondary" onClick={() => addRow('above')} className="bg-purple-500 text-white">
              Add Row Above
            </Button>
            <Button color="secondary" onClick={() => addRow('below')} className="bg-purple-500 text-white">
              Add Row Below
            </Button>
          </>
        )}
        {selectedCol !== null && (
          <>
            <Button color="secondary" onClick={() => addColumn('left')} className="bg-purple-500 text-white">
              Add Column Left
            </Button>
            <Button color="secondary" onClick={() => addColumn('right')} className="bg-purple-500 text-white">
              Add Column Right
            </Button>
          </>
        )}
      </div>

      {/* Table component */}
      <Table aria-label="Dynamic Spreadsheet" bordered className="table-auto border-collapse w-full">
        <TableHeader>
          {/* Empty cell for alignment before the column headers */}
          <TableColumn key="empty-space" className="p-2 bg-transparent"></TableColumn>
          {data[0] && data[0].map((_, colIndex) => (
            <TableColumn
              key={`col-${colIndex}`}
              className={`p-2 text-center bg-transparent cursor-pointer ${selectedCol === colIndex ? 'bg-blue-100 border border-blue-500' : ''} ${colIndex === 0 ? 'rounded-l-md' : ''} ${colIndex === data[0].length - 1 ? 'rounded-r-md' : ''}`}
              onClick={() => toggleColumnSelection(colIndex)}
            >
              {getColumnLabel(colIndex)}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow
              key={`row-${rowIndex}`}
              className={`${selectedRow === rowIndex ? 'bg-blue-100 border border-blue-500' : ''}`}
            >
              <TableCell
                className={`p-2 cursor-pointer ${selectedRow === rowIndex ? 'bg-blue-100 border border-blue-500' : ''} rounded-l-md`}
                onClick={() => toggleRowSelection(rowIndex)}
              >
                {rowIndex + 1}
              </TableCell>
              {row.map((cell, colIndex) => (
                <TableCell
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`p-2 ${selectedRow === rowIndex || selectedCol === colIndex ? 'bg-blue-100 border border-blue-500' : ''} ${colIndex === data[0].length - 1 ? 'rounded-r-md' : ''}`}
                >
                  <Input
                    value={cell || ''}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    aria-label={`Cell ${rowIndex + 1}-${getColumnLabel(colIndex)}`}
                    width="auto"
                    className="w-full"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Spreadsheet;
